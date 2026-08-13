import { generateObject } from "ai";
import dedent from "dedent";
import { z } from "zod";
import { gateway } from "./gateway";
import { ALLOWED_FONTS, type PageBlock, type SiteTheme } from "../../shared/site-model";

const themePatchSchema = z
  .object({
    layout: z.enum(["elegant", "natural", "bold"]).nullable(),
    bg: z.string().nullable(),
    surface: z.string().nullable(),
    text: z.string().nullable(),
    textDim: z.string().nullable(),
    accent: z.string().nullable(),
    accentText: z.string().nullable(),
    line: z.string().nullable(),
    fontHeading: z.enum(ALLOWED_FONTS).nullable(),
    fontBody: z.enum(ALLOWED_FONTS).nullable(),
    radius: z.enum(["none", "sm", "md", "lg"]).nullable(),
    rationale: z.string().nullable().describe("変更後の配色意図を日本語1文で"),
  })
  .nullable();

const editSchema = z.object({
  summary: z.string().describe("何をどう変えたかを日本語1〜2文で。ユーザーに見せる説明"),
  /** 変更したブロックのみ。JSON文字列で返させる（ブロック構造が多態のため） */
  changedBlocks: z
    .array(
      z.object({
        id: z.string().describe("変更対象ブロックのid"),
        json: z.string().describe("変更後のブロック全体を表すJSON文字列。元のキー構成とtypeは必ず維持する"),
      }),
    )
    .describe("変更が必要なブロックだけを列挙。変更不要なブロックは含めない"),
  themePatch: themePatchSchema.describe("配色やフォントの変更指示があった場合のみ。変えない項目はnull"),
});

export async function aiEditBlocks(args: {
  instruction: string;
  blocks: PageBlock[];
  theme: SiteTheme | null;
  businessName: string;
  categoryLabel: string;
}): Promise<{ summary: string; blocks: PageBlock[]; theme: SiteTheme | null; changedIds: string[] }> {
  const { object } = await generateObject({
    model: gateway("anthropic/claude-sonnet-4.6"),
    schema: editSchema,
    prompt: dedent`
      あなたは店舗サイトの編集アシスタントです。ユーザーの日本語指示にしたがって、
      サイトのコンテンツ（ブロックJSON）と必要ならテーマ（配色・フォント）を修正してください。

      店舗: ${args.businessName}（${args.categoryLabel}）

      # 現在のテーマ
      ${JSON.stringify(args.theme ?? {}, null, 2)}

      # 現在のページのブロック
      ${JSON.stringify(args.blocks, null, 2)}

      # ユーザーの指示
      ${args.instruction}

      # ルール
      - 指示に関係するブロックだけを changedBlocks に入れる。関係ないブロックは絶対に含めない。
      - 返すブロックJSONは、元と同じ id・type・キー構成を維持すること。キーの追加削除は禁止。
      - imageKey / imageKeys の値は絶対に変更しない（画像の差し替えはこの機能では行わない）。
      - 配色・フォント・雰囲気に関する指示（「もっと明るく」「和風に」など）のときは themePatch を返し、rationale も更新する。
        文章だけの指示なら themePatch は null。
      - 「見出しを明るい雰囲気に」のように文言に触れる指示なら、themePatch だけで済ませず、
        該当する見出しテキストそのものも必ず書き換えて changedBlocks に含めること。
      - 日本語は自然で誇張のない表現に。文字数は元のブロックと同程度に収める。
    `,
  });

  const patchMap = new Map(object.changedBlocks.map((b) => [b.id, b.json]));
  const changedIds: string[] = [];

  const blocks = args.blocks.map((b) => {
    const raw = patchMap.get(b.id);
    if (!raw) return b;
    try {
      const parsed = JSON.parse(raw) as PageBlock;
      if (parsed.type !== b.type) return b;
      changedIds.push(b.id);
      // 画像キーは常に元の値を維持する
      const preserved: any = { ...parsed, id: b.id };
      if ("imageKey" in b) preserved.imageKey = (b as any).imageKey;
      if ("imageKeys" in b) preserved.imageKeys = (b as any).imageKeys;
      return preserved as PageBlock;
    } catch {
      return b;
    }
  });

  let theme = args.theme;
  if (object.themePatch && args.theme) {
    const patch = Object.fromEntries(Object.entries(object.themePatch).filter(([, v]) => v !== null && v !== undefined));
    theme = { ...args.theme, ...patch } as SiteTheme;
  }

  return { summary: object.summary, blocks, theme, changedIds };
}
