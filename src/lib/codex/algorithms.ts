/*
 * Các thuật toán chép nguyên từ codex.html (BANGIAO §5): index(), candidates(),
 * mix(), check(). Đã chỉnh riêng cho tiếng Việt — KHÔNG viết lại cách làm.
 * Muốn cải thiện dò tên lạ thì mở rộng STOP hoặc chỉnh ngưỡng.
 *
 * Khác duy nhất so với bản gốc: chương đến từ nhiều truyện, nên mỗi chương
 * mang theo tên truyện và số thứ tự trong truyện của nó (ci).
 */
import type { CodexData, Entity } from "./schema";
import { allTypes, elementName, entityColors } from "./select";

export interface IndexChapter {
  id: string;
  storyId: string;
  storyTitle: string;
  /** Vị trí trong truyện, 0 = chương 1. */
  ci: number;
  title: string;
  /** Các đoạn văn, đã trim, bỏ đoạn rỗng. */
  paras: string[];
}

export interface Hit {
  cid: string;
  storyId: string;
  storyTitle: string;
  ci: number;
  title: string;
  para: number;
  snip: string;
  off: number;
  len: number;
}

export interface Mark {
  para: number;
  pos: number;
  end: number;
  tk: string;
  id: string;
  color: string;
}

export interface CodexIndex {
  /** by["char:id"] = mọi nơi xuất hiện. */
  by: Record<string, Hit[]>;
  /** ch[chapterId].marks = vị trí để tô sáng. */
  ch: Record<string, { paras: string[]; marks: Mark[] }>;
}

/** Tách văn bản thành đoạn đúng như Codex: mỗi dòng không rỗng là một đoạn. */
export function toParas(text: string): string[] {
  return text
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export const chapterLabel = (c: { title: string; ci: number }) => c.title || `Chương ${c.ci + 1}`;

/* ============ CHỈ MỤC TỰ ĐỘNG ============ */

const isW = (c: string | undefined) => (c ? /[\p{L}\p{N}_]/u.test(c) : false);

function targets(d: CodexData) {
  const t: { tk: string; id: string; text: string; color: string }[] = [];
  for (const ty of allTypes(d))
    for (const e of d.ent[ty.k] ?? []) {
      const ns = [e.name, ...String(e.aliases || "").split(",")].map((s) => s.trim()).filter((s) => s.length > 1);
      for (const n of new Set(ns)) t.push({ tk: ty.k, id: e.id, text: n, color: entityColors(d, e.els)[0] });
    }
  // Dài trước: "Thành Ashgard" phải khớp trước "Ashgard".
  return t.sort((a, b) => b.text.length - a.text.length);
}

function findAll(p: string, term: string) {
  const out: number[] = [];
  const lp = p.toLowerCase(),
    lt = term.toLowerCase();
  let i = lp.indexOf(lt);
  while (i !== -1) {
    if (!isW(p[i - 1]) && !isW(p[i + lt.length])) out.push(i);
    i = lp.indexOf(lt, i + 1);
  }
  return out;
}

export function buildIndex(d: CodexData, chapters: IndexChapter[]): CodexIndex {
  const tg = targets(d);
  const by: CodexIndex["by"] = {};
  const ch: CodexIndex["ch"] = {};
  for (const c of chapters) {
    const ps = c.paras;
    ch[c.id] = { paras: ps, marks: [] };
    ps.forEach((p, pi) => {
      const taken: [number, number][] = [];
      for (const t of tg)
        for (const pos of findAll(p, t.text)) {
          const end = pos + t.text.length;
          if (taken.some(([a, b]) => pos < b && end > a)) continue;
          taken.push([pos, end]);
          const key = `${t.tk}:${t.id}`;
          (by[key] ??= []).push({
            cid: c.id,
            storyId: c.storyId,
            storyTitle: c.storyTitle,
            ci: c.ci,
            title: chapterLabel(c),
            para: pi,
            snip: p.slice(Math.max(0, pos - 46), Math.min(p.length, end + 46)),
            off: pos - Math.max(0, pos - 46),
            len: t.text.length,
          });
          ch[c.id].marks.push({ para: pi, pos, end, tk: t.tk, id: t.id, color: t.color });
        }
    });
  }
  return { by, ch };
}

/* ============ DÒ TÊN LẠ ============ */

const STOP = new Set(
  "nhưng và khi nàng chàng hắn anh chị cô cậu tôi ta một hai ba sau trước trong ngoài cả không nếu vì rồi lúc ngay thế mà bởi dù dưới trên đó này kia người có là những các với từ đến cho về như nó họ mình chúng bên giữa phía mọi mỗi tất vẫn đã sẽ đang chỉ còn lại thì được bị cùng hay hoặc tuy song vậy nên do tại bằng qua theo suốt khắp nữa chưa rất quá hơn nhất ai gì sao đâu nào bao cứ thôi đi ông bà em con cha mẹ thầy trò vua ngài chúng_ta giờ hôm nay mai đêm ngày sáng chiều tối năm tháng tuần phải nhìn nghe nói hỏi đáp làm thấy biết muốn cần xin vâng dạ ừ ờ à ồ ơ này ấy trời đất lần chuyện việc điều thứ cái con chiếc nơi chỗ khi_đó bấy_giờ sau_đó cuối_cùng thực_ra tất_cả bỗng chợt liền vụt khẽ chậm nhanh mạnh yếu".split(
    " ",
  ),
);
const isUp = (c: string | undefined) => !!c && c !== c.toLowerCase() && c === c.toUpperCase();
const stripPunct = (s: string) => s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

function knownNames(d: CodexData) {
  const s = new Set<string>();
  for (const t of allTypes(d))
    for (const e of d.ent[t.k] ?? [])
      for (let n of [e.name, ...String(e.aliases || "").split(",")]) {
        n = n.trim().toLowerCase();
        if (n) s.add(n);
      }
  return s;
}

export interface Candidate {
  txt: string;
  n: number;
  /** Số lần xuất hiện giữa câu — chữ đầu câu tiếng Việt luôn hoa nên không đáng tin. */
  mid: number;
  ex: string;
  ci: number;
  pi: number;
  cid: string;
  storyTitle: string;
}

export function candidates(d: CodexData, chapters: IndexChapter[]): Candidate[] {
  const known = knownNames(d);
  const ign = new Set((d.ignore || []).map((x) => x.toLowerCase()));
  const m: Record<string, Candidate> = {};
  for (const c of chapters)
    c.paras.forEach((para, pi) => {
      for (const sent of para.split(/(?<=[.!?…:;])\s+/)) {
        const toks = sent.trim().split(/\s+/);
        let i = 0;
        while (i < toks.length) {
          const w = stripPunct(toks[i]);
          if (w && isUp(w[0])) {
            const run = [w];
            let j = i + 1;
            while (j < toks.length && run.length < 4) {
              const nx = stripPunct(toks[j]);
              if (nx && isUp(nx[0])) {
                run.push(nx);
                j++;
              } else break;
            }
            const txt = run.join(" "),
              key = txt.toLowerCase();
            const head = i === 0;
            if (!known.has(key) && !ign.has(key) && !(run.length === 1 && STOP.has(key)) && txt.length > 1) {
              const o = (m[key] ??= { txt, n: 0, mid: 0, ex: "", ci: c.ci, pi, cid: c.id, storyTitle: c.storyTitle });
              o.n++;
              if (!head) o.mid++;
              if (!o.ex) o.ex = sent.trim().slice(0, 120);
            }
            i = j;
          } else i++;
        }
      }
    });
  return Object.values(m)
    .filter((o) => o.mid > 0 || o.n >= 3)
    .sort((a, b) => b.mid - a.mid || b.n - a.n)
    .slice(0, 100);
}

/* ============ HỢP THÀNH SKILL ============ */

export interface MixResult {
  name: string;
  desc: string;
  els: string[];
  type: string;
  range: string;
  rank: string;
  mech: string;
  recipe: [string, string];
}

export function mix(d: CodexData, a: Entity, b: Entity): MixResult {
  const els = [...new Set([...(a.els || []), ...(b.els || [])])];
  const R = d.world.ranks?.length ? d.world.ranks : ["E", "D", "C", "B", "A", "S"];
  const hi = Math.max(R.indexOf(a.f.rank), R.indexOf(b.f.rank));
  const rank = R[Math.min(R.length - 1, (hi < 0 ? 0 : hi) + 1)] || "A";
  const heavy = ["Tuyệt kỹ", "Lãnh vực", "Biến hình", "Triệu hồi", "Cấm thuật"];
  const type = heavy.includes(a.f.type) ? a.f.type : heavy.includes(b.f.type) ? b.f.type : a.f.type || "Chủ động";
  const sc = ["Toàn bản đồ", "Diện rộng", "Vùng", "Toàn đội", "Đồng minh", "Đơn mục tiêu", "Bản thân"];
  const range = sc.indexOf(a.f.range) <= sc.indexOf(b.f.range) ? a.f.range : b.f.range;
  const h = (a.name || "").split(" ").slice(0, 2).join(" "),
    t = (b.name || "").split(" ").slice(-2).join(" ");
  return {
    name: h + " " + t + (els.length ? " — " + els.map((id) => elementName(d, id)).join(" · ") : ""),
    desc: (a.f.desc || "") + " Kết hợp với: " + (b.f.desc || "").replace(/^./, (c) => c.toLowerCase()),
    els,
    type,
    range: range || "Đơn mục tiêu",
    rank,
    mech: [a.f.mech, b.f.mech].filter(Boolean).join(" + "),
    recipe: [a.id, b.id],
  };
}

/* ============ KIỂM TRA MÂU THUẪN ============ */

export function check(d: CodexData, ix: CodexIndex, chapters: IndexChapter[]): string[] {
  const out: string[] = [];
  const skills = d.ent.skill ?? [],
    chars = d.ent.char ?? [];
  const byId = (list: Entity[], id: string) => list.find((x) => x.id === id);
  for (const c of chapters) {
    const dd = ix.ch[c.id];
    if (!dd) continue;
    const where = (c.storyTitle ? `${c.storyTitle} · ` : "") + "Chương " + (c.ci + 1);
    const pm: Record<number, Mark[]> = {};
    for (const m of dd.marks) (pm[m.para] ??= []).push(m);
    for (const [pi, ms] of Object.entries(pm)) {
      const cm = ms.filter((m) => m.tk === "char"),
        sks = ms.filter((m) => m.tk === "skill");
      for (const sm of sks) {
        const s = byId(skills, sm.id);
        if (!s) continue;
        const own = s.r.owner ?? [];
        if (own.length) {
          if (cm.length && !cm.some((x) => own.includes(x.id)))
            out.push(`${where} · đoạn ${+pi + 1}: skill độc quyền “${s.name}” xuất hiện nhưng chủ nhân không có mặt.`);
        } else if (cm.length === 1) {
          const c2 = byId(chars, cm[0].id);
          if (c2 && !(c2.r.skill ?? []).includes(s.id))
            out.push(`${where} · đoạn ${+pi + 1}: “${c2.name}” đi cùng skill “${s.name}” nhưng skill chưa có trong hồ sơ nhân vật.`);
        }
      }
      for (const m of cm) {
        const c2 = byId(chars, m.id);
        const dc = c2?.f.deathCh;
        if (c2 && dc && c.ci + 1 > +dc) out.push(`${where}: “${c2.name}” đã qua đời ở chương ${dc} nhưng vẫn xuất hiện.`);
      }
    }
  }
  for (const c of chars) if (!c.els.length) out.push(`“${c.name || "(chưa đặt tên)"}” chưa được gán hệ.`);
  return [...new Set(out)].slice(0, 60);
}
