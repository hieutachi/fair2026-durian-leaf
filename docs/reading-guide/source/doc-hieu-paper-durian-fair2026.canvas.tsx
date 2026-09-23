import {
  BarChart,
  Button,
  Callout,
  ChartContainer,
  Checkbox,
  Code,
  CollapsibleSection,
  Divider,
  DocsSection,
  Grid,
  H1,
  H3,
  MetricsGrid,
  Pill,
  Progress,
  ReferencePanel,
  ReportSection,
  ReportShell,
  Row,
  SendToChatButton,
  Stack,
  Stat,
  Table,
  Tag,
  Text,
  TextArea,
  Timeline,
  useCanvasState,
  useHostTheme,
} from "qoder/canvas";

/* =========================================================================
   ĐỌC HIỂU PAPER FAIR 2026 — BỆNH LÁ SẦU RIÊNG
   Tài liệu tự học dành cho Vũ Thị Thanh Nhài (đồng tác giả).
   Mọi số liệu lấy từ bài báo và artefact trong results/. Không sửa tay.
   ========================================================================= */

const PAPER_TITLE =
  "Cost-Aware Durian Leaf Disease Classification for Vietnamese Orchards: A Frozen-Backbone Pipeline with Statistical Validation";

/* ---------- DỮ LIỆU CỦA BÀI (đọc từ artefact) ---------- */

const TABLE3_CATEGORIES = [
  "End-to-end CNN",
  "Frozen LR (embedding)",
  "Concat LR",
  "Handcrafted XGBoost",
];
const TABLE3_VALUES = [0.9255, 0.9235, 0.9207, 0.8151];

const PERCLASS_CATEGORIES = [
  "Healthy",
  "Algal",
  "Phomopsis",
  "Rhizoctonia",
  "Colletotrichum",
  "Blight",
];
const PERCLASS_VALUES = [0.9753, 0.9701, 0.949, 0.9122, 0.8021, 0.7851];

const OOD_CATEGORIES = ["Teacher (end-to-end)", "Frozen head"];
const OOD_IN = [0.9889, 0.985];
const OOD_OUT = [0.3782, 0.3811];

const INTERVENTION_CATEGORIES = [
  "Baseline (CE)",
  "Weighted CE",
  "Focal loss",
  "Augmented",
];
const INTERVENTION_MACRO = [0.9088, 0.8858, 0.9025, 0.905];
const INTERVENTION_BLIGHT = [0.8004, 0.753, 0.7651, 0.8104];
const INTERVENTION_COLLE = [0.8152, 0.8116, 0.8261, 0.8056];

const COST_CATEGORIES = [
  "Teacher (fine-tune cả mạng)",
  "Frozen LR (chỉ fit head)",
  "Linear SVC (chỉ fit head)",
];
const COST_SECONDS = [57.7, 1.28, 0.44];

const HEADLINE_METRICS = [
  {
    label: "Teacher, 3 seed",
    value: "0.9088",
    valueSuffix: " ± 0.0119",
    description: "macro-F1 test, trung bình seed 42/43/44",
  },
  {
    label: "Frozen LR",
    value: "0.9235",
    description: "một seed, so với 0.9255 của teacher cùng seed — KHÔNG so với 0.9088",
    tone: "success" as const,
  },
  {
    label: "McNemar",
    value: "p = 0.7266",
    description: "teacher vs hybrid concat: không phát hiện khác biệt",
    tone: "info" as const,
  },
  {
    label: "Zero-shot OOD",
    value: "0.3782",
    description: "rơi từ 0.9889 khi sang bộ độc lập, 4 lớp chung",
    tone: "danger" as const,
  },
];

/* ---------- THÀNH PHẦN PHỤ (không dùng hook, nhận props) ---------- */

function Reveal(props: {
  title: string;
  revealed: boolean;
  onToggle: () => void;
  hint?: string;
  children?: any;
}) {
  return (
    <Stack gap="inline">
      <Row gap="inline" align="center" wrap>
        <Button
          variant={props.revealed ? "secondary" : "outline"}
          size="sm"
          onClick={props.onToggle}
        >
          {props.revealed ? "Ẩn đáp án" : "Hiện đáp án"}
        </Button>
        {props.hint ? (
          <Text size="small" tone="tertiary">
            {props.hint}
          </Text>
        ) : null}
      </Row>
      {props.revealed ? props.children : null}
    </Stack>
  );
}

function PredictionBox(props: {
  code: string;
  question: string;
  value: string;
  onChange: (v: string) => void;
  revealed: boolean;
  onToggle: () => void;
  answer: any;
}) {
  return (
    <Stack gap="component">
      <Row gap="inline" align="start">
        <Pill tone="primary">{props.code}</Pill>
        <Text weight="semibold">{props.question}</Text>
      </Row>
      <TextArea
        rows={3}
        value={props.value}
        onChange={props.onChange}
        placeholder="Viết dự đoán của em TRƯỚC KHI bấm hiện đáp án. Ghi cả lý do, không chỉ đoán kết quả."
      />
      <Reveal
        title="Đáp án"
        revealed={props.revealed}
        onToggle={props.onToggle}
        hint="Chỉ mở sau khi đã viết xong dự đoán"
      >
        {props.answer}
      </Reveal>
    </Stack>
  );
}

function QA(props: {
  code: string;
  level: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
  question: string;
  revealed: boolean;
  onToggle: () => void;
  answer: any;
}) {
  return (
    <CollapsibleSection
      size="sm"
      title={
        <Row gap="inline" align="center" wrap>
          <Tag tone={props.tone} size="sm">
            {props.level}
          </Tag>
          <Text weight="medium">{props.code + ". " + props.question}</Text>
        </Row>
      }
      trailing={
        <Button variant="text" size="sm" onClick={props.onToggle}>
          {props.revealed ? "Ẩn đáp án" : "Xem đáp án"}
        </Button>
      }
    >
      {props.revealed ? props.answer : <Text tone="secondary">Trả lời ra giấy hoặc nói thành tiếng trước, rồi mới mở đáp án để đối chiếu.</Text>}
    </CollapsibleSection>
  );
}

function DefenseRow(props: {
  q: string;
  wrong: string;
  right: string;
  revealed: boolean;
  onToggle: () => void;
}) {
  return (
    <Stack gap="inline">
      <Row gap="inline" align="start">
        <Button variant="text" size="sm" onClick={props.onToggle}>
          {props.revealed ? "−" : "+"}
        </Button>
        <Text weight="semibold">{props.q}</Text>
      </Row>
      {props.revealed ? (
        <Stack gap="inline" style={{ paddingLeft: 28 }}>
          <Callout tone="danger" title="Trả lời thế này là mất điểm">
            <Text size="small">{props.wrong}</Text>
          </Callout>
          <Callout tone="success" title="Trả lời thế này">
            <Text size="small">{props.right}</Text>
          </Callout>
        </Stack>
      ) : null}
    </Stack>
  );
}

/* ---------- SƠ ĐỒ SVG (dùng theme tokens, không hardcode màu) ---------- */

function SText(props: {
  x: number;
  y: number;
  lines: string[];
  tokens: any;
  size?: number;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  lh?: number;
}) {
  const size = props.size || 12;
  const lh = props.lh || size + 5;
  const anchor = props.anchor || "middle";
  const fill = props.fill || props.tokens.text.primary;
  return (
    <text
      x={props.x}
      y={props.y}
      textAnchor={anchor}
      fill={fill}
      fontSize={size}
      fontWeight={props.weight || 400}
    >
      {props.lines.map((l, i) => (
        <tspan key={i} x={props.x} dy={i === 0 ? 0 : lh}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function SBox(props: {
  x: number;
  y: number;
  w: number;
  h: number;
  tokens: any;
  fill?: string;
  stroke?: string;
  dashed?: boolean;
  rx?: number;
}) {
  return (
    <rect
      x={props.x}
      y={props.y}
      width={props.w}
      height={props.h}
      rx={props.rx == null ? 8 : props.rx}
      fill={props.fill || props.tokens.fill.tertiary}
      stroke={props.stroke || props.tokens.stroke.secondary}
      strokeWidth={1.5}
      strokeDasharray={props.dashed ? "6 4" : undefined}
    />
  );
}

function SDefs(props: { id: string; color: string }) {
  return (
    <defs>
      <marker
        id={props.id}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={props.color} />
      </marker>
    </defs>
  );
}

/* --- Sơ đồ 1: Pipeline tổng quan --- */
function DiagramPipeline(props: { tokens: any }) {
  const t = props.tokens;
  const ar = t.stroke.secondary;
  return (
    <svg viewBox="0 0 920 352" width="100%" role="img" aria-label="Sơ đồ pipeline frozen-backbone">
      <SDefs id="ar-pipe" color={ar} />
      <SBox x={16} y={120} w={152} h={76} tokens={t} fill={t.status.infoBg} stroke={t.status.infoBorder} />
      <SText x={92} y={144} tokens={t} size={12.5} weight={600} lines={["Bộ dữ liệu", "2595 ảnh · 6 lớp", "1814 / 387 / 394"]} />

      <SBox x={206} y={102} w={178} h={112} tokens={t} fill={t.status.dangerBg} stroke={t.status.dangerBorder} />
      <SText x={295} y={126} tokens={t} size={13} weight={700} lines={["MobileNetV2", "2.232M tham số · 8.75 MB"]} />
      <SText x={295} y={172} tokens={t} size={11.5} weight={700} fill={t.status.danger} lines={["TRAIN MỘT LẦN", "RỒI ĐÓNG BĂNG"]} />

      <SBox x={424} y={48} w={158} h={66} tokens={t} fill={t.status.successBg} stroke={t.status.successBorder} />
      <SText x={503} y={72} tokens={t} size={12.5} weight={600} lines={["Embedding sâu", "1280 chiều"]} />

      <SBox x={424} y={200} w={158} h={66} tokens={t} fill={t.fill.tertiary} stroke={t.stroke.tertiary} dashed />
      <SText x={503} y={224} tokens={t} size={12.5} weight={600} lines={["Đặc trưng thủ công", "71 chiều · 4 họ"]} />

      <SBox x={622} y={120} w={168} h={76} tokens={t} fill={t.status.successBg} stroke={t.status.successBorder} />
      <SText x={706} y={144} tokens={t} size={12.5} weight={600} lines={["Classifier head", "1.28 s · 0.089 MB"]} />
      <SText x={706} y={180} tokens={t} size={11.5} weight={700} fill={t.status.success} lines={["RẺ KHI CẬP NHẬT"]} />

      <SBox x={828} y={132} w={78} h={52} tokens={t} />
      <SText x={867} y={153} tokens={t} size={12} weight={600} lines={["Dự đoán", "6 lớp"]} />

      <path d={`M 168 158 L 200 158`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-pipe)" />
      <path d={`M 384 130 C 404 130 404 84 418 84`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-pipe)" />
      <path d={`M 582 81 L 602 81 L 602 146 L 616 146`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-pipe)" />
      <path d={`M 582 233 L 602 233 L 602 170 L 616 170`} stroke={ar} strokeWidth={2} fill="none" strokeDasharray="6 4" markerEnd="url(#ar-pipe)" />
      <path d={`M 790 158 L 822 158`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-pipe)" />
      <path d={`M 92 196 L 92 280 L 503 280 L 503 272`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-pipe)" />
      <SText x={298} y={274} tokens={t} size={11} fill={t.text.tertiary} anchor="middle" lines={["tính trực tiếp từ ảnh (không qua CNN)"]} />
      <SText x={602} y={120} tokens={t} size={11} fill={t.text.secondary} anchor="middle" lines={["concat = 1351 chiều"]} />

      <SBox x={16} y={300} w={890} h={38} tokens={t} fill={t.fill.quaternary} stroke={t.stroke.tertiary} rx={6} />
      <SText x={461} y={324} tokens={t} size={11.5} fill={t.text.secondary} lines={["Giao thức đánh giá: 3 seed (42/43/44) · 5 lần xáo trộn tập train · McNemar · bootstrap 2000 · cost profiling — tất cả trên CÙNG tập test 394 ảnh"]} />
    </svg>
  );
}

/* --- Sơ đồ 2: Ranh giới train / val / test --- */
function DiagramProtocol(props: { tokens: any }) {
  const t = props.tokens;
  const ar = t.stroke.secondary;
  return (
    <svg viewBox="0 0 920 268" width="100%" role="img" aria-label="Sơ đồ ranh giới train validation test">
      <SDefs id="ar-proto" color={ar} />
      <SBox x={40} y={40} w={489} h={46} tokens={t} fill={t.status.infoBg} stroke={t.status.infoBorder} rx={4} />
      <SBox x={529} y={40} w={104} h={46} tokens={t} fill={t.status.warningBg} stroke={t.status.warningBorder} rx={4} />
      <SBox x={633} y={40} w={106} h={46} tokens={t} fill={t.status.successBg} stroke={t.status.successBorder} rx={4} />
      <SText x={284} y={60} tokens={t} size={12.5} weight={600} lines={["TRAIN — 1814 ảnh (69.9%)"]} />
      <SText x={581} y={60} tokens={t} size={12} weight={600} lines={["VAL", "387"]} />
      <SText x={686} y={60} tokens={t} size={12} weight={600} lines={["TEST", "394"]} />

      <path d={`M 40 100 L 40 108 L 633 108 L 633 100`} stroke={t.status.warning} strokeWidth={1.5} fill="none" />
      <SText x={336} y={126} tokens={t} size={11.5} weight={600} fill={t.status.warning} lines={["pool train + val = 2201 ảnh → 5 lần xáo trộn (stratified 5-fold)"]} />
      <path d={`M 633 100 L 633 140`} stroke={t.status.success} strokeWidth={2} fill="none" strokeDasharray="4 3" />
      <SText x={662} y={136} tokens={t} size={11} fill={t.status.success} anchor="start" lines={["test KHÔNG bị đụng tới"]} />

      <SBox x={330} y={156} w={290} h={62} tokens={t} fill={t.status.warningBg} stroke={t.status.warningBorder} />
      <SText x={475} y={176} tokens={t} size={12} weight={700} fill={t.status.warning} lines={["VALIDATION quyết định:"]} />
      <SText x={475} y={196} tokens={t} size={11.5} lines={["chọn seed backbone (ra seed 42)", "chọn cấu hình head (ra concat LR)"]} />

      <SBox x={652} y={156} w={252} h={62} tokens={t} fill={t.status.successBg} stroke={t.status.successBorder} />
      <SText x={778} y={176} tokens={t} size={12} weight={700} fill={t.status.success} lines={["TEST chỉ đọc MỘT LẦN"]} />
      <SText x={778} y={196} tokens={t} size={11.5} lines={["để báo cáo kết quả cuối cùng"]} />

      <path d={`M 581 86 L 581 130 L 475 130 L 475 150`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-proto)" />
      <path d={`M 686 86 L 686 132 L 778 132 L 778 150`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-proto)" />

      <SText x={40} y={246} tokens={t} size={11.5} fill={t.status.danger} anchor="start" weight={600} lines={["Chọn mô hình theo test = leakage. Đây là ranh giới em phải nói rõ khi bị hỏi 'làm sao biết em không chọn theo test?'."]} />
    </svg>
  );
}

/* --- Sơ đồ 3: Luồng suy luận thống kê --- */
function DiagramStats(props: { tokens: any }) {
  const t = props.tokens;
  const ar = t.stroke.secondary;
  return (
    <svg viewBox="0 0 920 340" width="100%" role="img" aria-label="Luồng suy luận thống kê từ McNemar đến kết luận được phép nói">
      <SDefs id="ar-stat" color={ar} />
      <SBox x={14} y={26} w={206} h={66} tokens={t} />
      <SText x={117} y={50} tokens={t} size={12} weight={600} lines={["394 ảnh test", "dùng chung 2 mô hình"]} />

      <SBox x={244} y={26} w={206} h={66} tokens={t} fill={t.status.infoBg} stroke={t.status.infoBorder} />
      <SText x={347} y={50} tokens={t} size={12} weight={600} lines={["8 ảnh bất đồng", "5 teacher · 3 hybrid"]} />

      <SBox x={474} y={26} w={200} h={66} tokens={t} />
      <SText x={574} y={50} tokens={t} size={12} weight={600} lines={["McNemar exact", "p = 0.7266"]} />

      <SBox x={698} y={26} w={208} h={66} tokens={t} />
      <SText x={802} y={44} tokens={t} size={12} weight={600} lines={["Bootstrap 2000 lần", "Δ = +0.0050", "CI [−0.0094, +0.0198]"]} />

      <path d={`M 220 59 L 238 59`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-stat)" />
      <path d={`M 450 59 L 468 59`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-stat)" />
      <path d={`M 674 59 L 692 59`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-stat)" />

      <path d={`M 460 92 L 460 128`} stroke={ar} strokeWidth={2} fill="none" markerEnd="url(#ar-stat)" />
      <SBox x={330} y={134} w={260} h={48} tokens={t} fill={t.fill.quaternary} stroke={t.stroke.tertiary} />
      <SText x={460} y={153} tokens={t} size={12} weight={600} lines={["α = 0.05 → KHÔNG bác bỏ H0", "(H0: hai mô hình ngang nhau)"]} />

      <path d={`M 400 182 L 250 216`} stroke={t.status.success} strokeWidth={2} fill="none" markerEnd="url(#ar-stat)" />
      <path d={`M 520 182 L 670 216`} stroke={t.status.danger} strokeWidth={2} fill="none" markerEnd="url(#ar-stat)" />

      <SBox x={40} y={220} w={420} h={104} tokens={t} fill={t.status.successBg} stroke={t.status.successBorder} />
      <SText x={250} y={244} tokens={t} size={12.5} weight={700} fill={t.status.success} lines={["ĐƯỢC NÓI"]} />
      <SText x={250} y={268} tokens={t} size={11.5} lines={["'Trong giao thức test cố định này,", "chúng tôi không phát hiện khác biệt", "giữa teacher và hybrid concat.'"]} />
      <SText x={250} y={310} tokens={t} size={11} fill={t.text.tertiary} lines={["+ 'khoảng cách quan sát được rất nhỏ, nằm trong biến thiên giữa các seed'"]} />

      <SBox x={484} y={220} w={422} h={104} tokens={t} fill={t.status.dangerBg} stroke={t.status.dangerBorder} />
      <SText x={695} y={244} tokens={t} size={12.5} weight={700} fill={t.status.danger} lines={["KHÔNG ĐƯỢC NÓI"]} />
      <SText x={695} y={268} tokens={t} size={11.5} lines={["'Hai mô hình tương đương nhau.'", "p lớn = thiếu bằng chứng,", "không phải bằng chứng của sự vắng mặt"]} />
      <SText x={695} y={310} tokens={t} size={11} fill={t.text.tertiary} lines={["Muốn nói tương đương: cần TOST với biên định nghĩa TRƯỚC"]} />
    </svg>
  );
}

/* --- Sơ đồ 4: Không gian nhãn khi chuyển miền --- */
function DiagramOOD(props: { tokens: any }) {
  const t = props.tokens;
  const ar = t.stroke.secondary;
  return (
    <svg viewBox="0 0 920 366" width="100%" role="img" aria-label="Không gian nhãn nguồn và đích, quy tắc restricted và unrestricted">
      <SDefs id="ar-ood" color={ar} />
      <SBox x={20} y={54} w={266} h={150} tokens={t} fill={t.status.dangerBg} stroke={t.status.dangerBorder} />
      <SText x={153} y={80} tokens={t} size={12} weight={700} fill={t.status.danger} lines={["CHỈ CÓ Ở NGUỒN"]} />
      <SText x={153} y={110} tokens={t} size={12} lines={["Leaf_Colletotrichum", "Leaf_Rhizoctonia"]} />
      <SText x={153} y={164} tokens={t} size={11} fill={t.text.tertiary} lines={["2 lớp này bị LOẠI khỏi", "phép so sánh OOD", "→ đó là lý do in-domain", "nhảy lên 0.9889"]} />

      <SBox x={292} y={54} w={336} h={150} tokens={t} fill={t.status.successBg} stroke={t.status.successBorder} />
      <SText x={460} y={80} tokens={t} size={12.5} weight={700} fill={t.status.success} lines={["4 LỚP CHUNG — không gian so sánh"]} />
      <SText x={460} y={112} tokens={t} size={12} lines={["Leaf_Algal · Leaf_Blight", "Leaf_Healthy · Leaf_Phomopsis"]} />
      <SText x={460} y={164} tokens={t} size={11} fill={t.text.secondary} lines={["Nguồn: 273 ảnh test · Đích: 707 / 890 ảnh test", "In-domain 0.9889 → OOD 0.3782 (Δ = −0.6107)"]} />

      <SBox x={634} y={54} w={266} h={150} tokens={t} fill={t.fill.tertiary} stroke={t.stroke.tertiary} dashed />
      <SText x={767} y={80} tokens={t} size={12} weight={700} lines={["CHỈ CÓ Ở ĐÍCH"]} />
      <SText x={767} y={110} tokens={t} size={12} lines={["ALLOCARIDARA_ATTACK", "(sâu hại)"]} />
      <SText x={767} y={164} tokens={t} size={11} fill={t.text.tertiary} lines={["BỊ LOẠI. Bài không nói gì", "về nhận diện côn trùng.", "183 ảnh đích bị loại"]} />

      <path d={`M 20 40 L 20 32 L 628 32 L 628 40`} stroke={t.stroke.secondary} strokeWidth={1.5} fill="none" />
      <SText x={324} y={24} tokens={t} size={11.5} weight={600} fill={t.text.secondary} lines={["NGUỒN: Mendeley pxzvksbwnj · 6 lớp · 2595 ảnh"]} />
      <path d={`M 292 218 L 292 226 L 900 226 L 900 218`} stroke={t.stroke.secondary} strokeWidth={1.5} fill="none" />
      <SText x={596} y={244} tokens={t} size={11.5} weight={600} fill={t.text.secondary} lines={["ĐÍCH: Kaggle cthng123 · 5 lớp · 890 ảnh test · Đông Nam Bộ"]} />

      <SBox x={20} y={266} w={436} h={88} tokens={t} fill={t.status.infoBg} stroke={t.status.infoBorder} />
      <SText x={238} y={288} tokens={t} size={12} weight={700} fill={t.status.info} lines={["Quy tắc RESTRICTED — con số chính của bài"]} />
      <SText x={238} y={310} tokens={t} size={11.5} lines={["argmax CHỈ trên 4 logit của lớp chung", "→ teacher 0.3782 · frozen head 0.3811"]} />
      <SText x={238} y={340} tokens={t} size={11} fill={t.text.tertiary} lines={["cách xử lý chuẩn khi không gian nhãn không khớp"]} />

      <SBox x={464} y={266} w={436} h={88} tokens={t} fill={t.status.warningBg} stroke={t.status.warningBorder} />
      <SText x={682} y={288} tokens={t} size={12} weight={700} fill={t.status.warning} lines={["Quy tắc UNRESTRICTED — đo mức thoát nhãn"]} />
      <SText x={682} y={310} tokens={t} size={11.5} lines={["argmax trên CẢ 6 logit nguồn → accuracy 0.4158", "91 / 707 ảnh rơi vào lớp không tồn tại ở đích"]} />
      <SText x={682} y={340} tokens={t} size={11} fill={t.text.tertiary} lines={["dồn vào MỘT lớp: Rhizoctonia 90 · Colletotrichum 1"]} />
    </svg>
  );
}

/* --- Sơ đồ 5: Đồ thị nhầm lẫn giữa các lớp hoại tử --- */
function DiagramConfusion(props: { tokens: any }) {
  const t = props.tokens;
  return (
    <svg viewBox="0 0 920 276" width="100%" role="img" aria-label="Đồ thị nhầm lẫn giữa Blight, Colletotrichum và Rhizoctonia">
      <SDefs id="ar-conf" color={t.status.danger} />
      <SDefs id="ar-conf2" color={t.status.warning} />

      <path d={`M 300 96 C 400 56 520 56 620 96`} stroke={t.status.danger} strokeWidth={2.5} fill="none" markerEnd="url(#ar-conf)" />
      <SText x={460} y={52} tokens={t} size={12.5} weight={700} fill={t.status.danger} lines={["Colletotrichum → Blight: 8 ảnh"]} />

      <path d={`M 620 128 C 520 168 400 168 300 128`} stroke={t.status.danger} strokeWidth={2.5} fill="none" markerEnd="url(#ar-conf)" />
      <SText x={460} y={184} tokens={t} size={12.5} weight={700} fill={t.status.danger} lines={["Blight → Colletotrichum: 6 ảnh"]} />

      <path d={`M 268 150 C 300 200 350 220 402 228`} stroke={t.status.warning} strokeWidth={2.5} fill="none" markerEnd="url(#ar-conf2)" />
      <SText x={286} y={212} tokens={t} size={12.5} weight={700} fill={t.status.warning} anchor="start" lines={["Blight → Rhizoctonia: 5 ảnh"]} />

      <ellipse cx={230} cy={112} rx={96} ry={46} fill={t.status.dangerBg} stroke={t.status.dangerBorder} strokeWidth={2} />
      <SText x={230} y={104} tokens={t} size={14} weight={700} lines={["Blight"]} />
      <SText x={230} y={126} tokens={t} size={11} fill={t.text.secondary} lines={["F1 0.8333 · CV 0.7851"]} />

      <ellipse cx={690} cy={112} rx={112} ry={46} fill={t.status.dangerBg} stroke={t.status.dangerBorder} strokeWidth={2} />
      <SText x={690} y={104} tokens={t} size={14} weight={700} lines={["Colletotrichum"]} />
      <SText x={690} y={126} tokens={t} size={11} fill={t.text.secondary} lines={["F1 0.8421 · CV 0.8021"]} />

      <ellipse cx={470} cy={236} rx={96} ry={34} fill={t.status.warningBg} stroke={t.status.warningBorder} strokeWidth={2} />
      <SText x={470} y={232} tokens={t} size={13} weight={700} lines={["Rhizoctonia"]} />
      <SText x={470} y={252} tokens={t} size={10.5} fill={t.text.secondary} lines={["CV 0.9122"]} />

      <SBox x={742} y={196} w={164} h={66} tokens={t} fill={t.fill.quaternary} stroke={t.stroke.tertiary} rx={6} />
      <SText x={824} y={216} tokens={t} size={11.5} weight={600} lines={["3 cặp này = 19 / 28 lỗi", "nhầm theo CẢ HAI chiều", "→ mơ hồ thị giác thật,", "không phải lỗi định vị"]} />
    </svg>
  );
}

/* --- Sơ đồ 6: Hai con đường chi phí --- */
function DiagramCost(props: { tokens: any }) {
  const t = props.tokens;
  const W = 470;
  const frozenW = Math.max(6, Math.round((W * 1.28) / 57.7));
  const svcW = Math.max(5, Math.round((W * 0.44) / 57.7));
  const tb = 400;
  const fb = Math.round((tb * 8.394) / 8.291);
  const sb = Math.round((tb * 8.419) / 8.291);
  return (
    <svg viewBox="0 0 920 330" width="100%" role="img" aria-label="So sánh chi phí cập nhật và chi phí suy luận">
      <SBox x={14} y={16} w={892} h={150} tokens={t} fill={t.status.successBg} stroke={t.status.successBorder} rx={10} />
      <SText x={34} y={42} tokens={t} size={13} weight={700} fill={t.status.success} anchor="start" lines={["ĐƯỜNG A — CẬP NHẬT MÔ HÌNH (khi nhãn mới xuất hiện / chuyển vườn)  →  CÓ tiết kiệm"]} />

      <SText x={34} y={72} tokens={t} size={11.5} anchor="start" fill={t.text.secondary} lines={["Teacher: fine-tune cả mạng"]} />
      <rect x={250} y={60} width={W} height={20} rx={4} fill={t.chart.muted} />
      <SText x={730} y={75} tokens={t} size={12} weight={700} anchor="start" lines={["57.7 s · 8.748 MB"]} />

      <SText x={34} y={112} tokens={t} size={11.5} anchor="start" fill={t.text.secondary} lines={["Frozen LR: fit lại head trên embedding đã cache"]} />
      <rect x={250} y={100} width={frozenW} height={20} rx={4} fill={t.status.success} />
      <SText x={266 + frozenW} y={115} tokens={t} size={12} weight={700} anchor="start" fill={t.status.success} lines={["1.28 s · 0.089 MB  →  nhanh 45.1×"]} />

      <SText x={34} y={148} tokens={t} size={11.5} anchor="start" fill={t.text.secondary} lines={["Frozen linear SVC"]} />
      <rect x={250} y={136} width={svcW} height={16} rx={4} fill={t.status.success} />
      <SText x={266 + svcW} y={150} tokens={t} size={11.5} weight={600} anchor="start" fill={t.status.success} lines={["0.44 s → nhanh 131.1× (giữ 99.18%)"]} />

      <SBox x={14} y={182} w={892} h={132} tokens={t} fill={t.status.dangerBg} stroke={t.status.dangerBorder} rx={10} />
      <SText x={34} y={208} tokens={t} size={13} weight={700} fill={t.status.danger} anchor="start" lines={["ĐƯỜNG B — SUY LUẬN MỘT ẢNH  →  KHÔNG tiết kiệm (backbone vẫn phải chạy)"]} />

      <SText x={34} y={238} tokens={t} size={11.5} anchor="start" fill={t.text.secondary} lines={["Teacher: end-to-end"]} />
      <rect x={250} y={226} width={tb} height={20} rx={4} fill={t.chart.muted} />
      <SText x={662} y={241} tokens={t} size={12} weight={700} anchor="start" lines={["8.291 ms"]} />

      <SText x={34} y={274} tokens={t} size={11.5} anchor="start" fill={t.text.secondary} lines={["Frozen LR: head 0.103 ms + backbone"]} />
      <rect x={250} y={262} width={fb} height={20} rx={4} fill={t.status.danger} />
      <SText x={262 + fb} y={277} tokens={t} size={12} weight={700} anchor="start" fill={t.status.danger} lines={["8.394 ms  →  gần như không đổi"]} />

      <SText x={34} y={304} tokens={t} size={11} anchor="start" fill={t.text.tertiary} lines={["Linear SVC cũng vậy: 8.419 ms. head-only 0.103 ms là số đo RIÊNG của head, không phải trải nghiệm người dùng."]} />
    </svg>
  );
}

/* ---------- CANVAS CHÍNH ---------- */

export default function DocHieuPaperDurianFair2026() {
  const { tokens } = useHostTheme();
  const [predictions, setPredictions] = useCanvasState<Record<string, string>>(
    "nhai-predictions",
    {},
  );
  const [revealed, setRevealed] = useCanvasState<Record<string, boolean>>(
    "nhai-revealed",
    {},
  );
  const [checks, setChecks] = useCanvasState<Record<string, boolean>>(
    "nhai-checklist",
    {},
  );

  const toggle = (id: string) =>
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  const isOpen = (id: string) => !!revealed[id];

  const setPrediction = (id: string, v: string) =>
    setPredictions((prev) => ({ ...prev, [id]: v }));

  const checklistItems = [
    { id: "c1", label: "Nói được câu hỏi nghiên cứu của bài trong 1 câu, không nhìn giấy" },
    { id: "c2", label: "Kể được 5 đóng góp và giải thích vì sao mỗi cái là đóng góp" },
    { id: "c3", label: "Thuộc 5 con số headline và ý nghĩa của từng số" },
    { id: "c4", label: "Giải thích được vì sao chọn macro-F1 chứ không phải accuracy" },
    { id: "c5", label: "Đọc được Table 3 và chỉ ra cái bẫy 0.9235 so với 0.9088" },
    { id: "c6", label: "Giải thích McNemar và bootstrap cho người không học thống kê" },
    { id: "c7", label: "Nói đúng câu 'không phát hiện khác biệt' khác 'tương đương' ở đâu" },
    { id: "c8", label: "Giải thích vì sao in-domain Table 5 lại 0.9889, cao hơn Table 3" },
    { id: "c9", label: "Phân biệt được restricted và unrestricted trong đánh giá OOD" },
    { id: "c10", label: "Khẳng định đúng: lợi ích là chi phí cập nhật, KHÔNG phải latency" },
    { id: "c11", label: "Trình bày được phân tích lỗi và vì sao 3 can thiệp đều thất bại" },
    { id: "c12", label: "Nói được vì sao kết luận là giới hạn nhãn chứ không phải mất cân bằng lớp" },
    { id: "c13", label: "Liệt kê đủ 8 hạn chế và biết hạn chế nào dễ bị hỏi nhất" },
    { id: "c14", label: "Biết đường dẫn artefact của từng con số để mở ra chứng minh khi bị chất vấn" },
    { id: "c15", label: "Chạy thử được ít nhất bước A và B trong STUDENT_GUIDE để thấy số thật" },
    { id: "c16", label: "Tập thuyết trình 15 phút một lượt, bấm giờ, không vượt quá 17 phút" },
  ];

  const doneCount = checklistItems.filter((i) => !!checks[i.id]).length;

  const predictionDump = () => {
    const ids = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];
    const lines = ids.map(
      (id) => `${id}: ${(predictions[id] || "(chưa viết)").trim()}`,
    );
    return [
      "Thầy ơi, đây là phiếu dự đoán trước khi đọc của em cho paper FAIR 2026 (durian leaf).",
      "Thầy chấm giúp em chỗ nào em hiểu sai ạ:",
      "",
      ...lines,
    ].join("\n");
  };

  return (
    <ReportShell width="wide" ariaLabel="Đọc hiểu paper FAIR 2026 bệnh lá sầu riêng">
      <Stack gap="section">
        {/* ================= HEADER ================= */}
        <header>
          <Stack gap="component">
            <Row gap="inline" align="center" wrap>
              <Tag tone="primary">FAIR 2026</Tag>
              <Tag tone="info">Tài liệu tự học</Tag>
              <Tag tone="neutral">Tiếng Việt</Tag>
              <Tag tone="warning">Dành cho: Vũ Thị Thanh Nhai</Tag>
            </Row>
            <H1>Đọc hiểu paper: Phân loại bệnh lá sầu riêng với pipeline frozen-backbone</H1>
            <Text tone="secondary">{PAPER_TITLE}</Text>
            <Text size="small" tone="tertiary">
              Tác giả: Tạ Chí Hiếu (corresponding) và Vũ Thị Thanh Nhài — Đại học Thuỷ Lợi.
              Bài báo và toàn bộ số liệu đã khoá; tài liệu này chỉ giúp em đọc hiểu và thuyết trình lại.
            </Text>
            <MetricsGrid variant="header" columns={4} items={HEADLINE_METRICS} />
          </Stack>
        </header>

        <Callout tone="info" title="Vì sao có tài liệu này">
          <Text size="small">
            Em đã làm Đồ án tốt nghiệp về nội dung gần tương tự, nhưng bài báo này có nhiều chỗ
            tinh tế mà nếu đọc lướt sẽ hiểu sai — và hiểu sai thì khi thuyết trình sẽ bị hội đồng
            bắt được ngay. Tài liệu này đi từng bảng một, chỉ ra đúng chỗ dễ hiểu sai, cho em tự
            dự đoán trước khi đọc, rồi tự kiểm tra bằng bộ câu hỏi có đáp án. Mục tiêu cuối cùng:
            em đứng nói 15 phút về bài này một cách tự tin và không overclaim.
          </Text>
        </Callout>

        {/* ================= 0. CÁCH DÙNG ================= */}
        <ReportSection
          title="0. Cách dùng tài liệu này"
          description="Đừng đọc một mạch từ trên xuống. Làm theo 5 buổi dưới đây."
          divided
        >
          <Stack gap="component">
            <Timeline
              events={[
                {
                  id: "b1",
                  timestamp: "Buổi 1 · 60 phút",
                  title: "Làm phiếu dự đoán (mục 2) TRƯỚC KHI mở bài báo",
                  description:
                    "Viết ra giấy hoặc gõ vào ô textarea. Đoán sai không sao — đoán sai rồi mới nhớ lâu. Xong buổi này mới được mở file paper.",
                  state: "current",
                },
                {
                  id: "b2",
                  timestamp: "Buổi 2 · 90 phút",
                  title: "Đọc Abstract + Section I + Section III (Methods)",
                  description:
                    "Đối chiếu với đáp án phiếu dự đoán. Ghi lại những chỗ em đoán sai và vì sao em đoán sai. Đọc mục 1 (bài này là gì / không là gì) và mục 3 (dữ liệu, giao thức) của tài liệu này song song.",
                  state: "upcoming",
                },
                {
                  id: "b3",
                  timestamp: "Buổi 3 · 120 phút",
                  title: "Đọc Section IV (Results) — từng bảng một",
                  description:
                    "Mở Table 3, 4, 5, 6 trong paper, đặt cạnh mục 4 đến mục 8 ở đây. Mỗi bảng: đọc số, đọc cách hiểu đúng, đọc cái bẫy. Nếu phần thống kê làm em rối, mở khung 'Phụ lục thống kê' ở cuối mục 5. Đây là buổi nặng nhất.",
                  state: "upcoming",
                },
                {
                  id: "b4",
                  timestamp: "Buổi 4 · 60 phút",
                  title: "Đọc Section V (Discussion + Limitations)",
                  description:
                    "Tập trung vào những gì bài KHÔNG khẳng định. Làm bộ câu hỏi tự kiểm tra ở mục 11 và mục 12.",
                  state: "upcoming",
                },
                {
                  id: "b5",
                  timestamp: "Buổi 5 · 90 phút",
                  title: "Dựng bài thuyết trình và tập nói",
                  description:
                    "Dùng kịch bản ở mục 13. Tập nói to, bấm giờ. Ghi âm lại rồi tự nghe — chỗ nào em nói vấp là chỗ em chưa hiểu thật.",
                  state: "upcoming",
                },
              ]}
            />
            <Divider />
            <Grid columns={3} gap="component" minColumnWidth={220}>
              <Stat
                label="Số bảng phải đọc kỹ"
                value="4"
                description="Table 3, 4, 5, 6 — cộng 4 bảng phụ S1 đến S4"
              />
              <Stat
                label="5 số phải thuộc lòng"
                value="5"
                description="0.9088±0.0119 · 0.8990±0.0103 · p=0.7266 & CI · 99.78%/45.1×/0.089MB · 0.9889→0.3782"
                tone="primary"
              />
              <Stat
                label="Số cái bẫy dễ hiểu sai"
                value="6"
                description="Đánh dấu bằng khung đỏ trong tài liệu này"
                tone="danger"
              />
            </Grid>
            <Callout tone="warning" title="Nguyên tắc khi thuyết trình">
              <Text size="small">
                Bài này là bài <b>đánh giá pipeline và chi phí triển khai</b>. Nếu em nói nhầm nó là
                "mô hình mới" hoặc "kết quả tốt hơn CNN" thì toàn bộ phần còn lại của bài thuyết trình
                sẽ bị hội đồng soi theo hướng đó. Nói đúng bản chất ngay từ slide đầu tiên.
              </Text>
            </Callout>
          </Stack>
        </ReportSection>

        {/* ================= 1. BÀI NÀY LÀ GÌ / KHÔNG LÀ GÌ ================= */}
        <ReportSection
          title="1. Bài báo này LÀ gì và KHÔNG là gì"
          description="Học thuộc bảng này trước tiên. Nó quyết định mọi câu trả lời của em sau này."
          divided
        >
          <Stack gap="component">
            <DocsSection title="Câu hỏi nghiên cứu, đúng một câu">
              <Text>
                <i>
                  Liệu một pipeline frozen-backbone có giữ được hiệu năng hữu ích trong miền
                  (in-domain) đồng thời giảm được chi phí đo được của việc cập nhật đầu phân loại
                  (classifier head), và cái trade-off thực tế đó có chịu được kiểm định thống kê
                  tường minh hay không?
                </i>
              </Text>
              <Text size="small" tone="secondary">
                Chú ý ba từ khoá trong câu hỏi: <b>giữ được</b> (không phải cải thiện), <b>chi phí
                cập nhật đo được</b> (không phải tốc độ suy luận), và <b>kiểm định thống kê</b>
                (không phải so sánh hai con số rồi kết luận).
              </Text>
            </DocsSection>

            <Table
              headers={["Bài báo KHẲNG ĐỊNH", "Bài báo KHÔNG khẳng định"]}
              rows={[
                [
                  "Có một benchmark tái lập được trên split chính thức của tác giả dữ liệu: 2595 ảnh, 6 lớp, 1814/387/394.",
                  "Không khẳng định đạt state-of-the-art. Bài cố tình không so kiến trúc.",
                ],
                [
                  "Teacher MobileNetV2 đạt 0.9088 ± 0.0119 macro-F1 test trên 3 seed, và 0.8990 ± 0.0103 khi xáo trộn tập train 5 lần.",
                  "Không khẳng định mô hình ổn định trên mọi tập dữ liệu — chỉ trên giao thức test cố định này.",
                ],
                [
                  "Trên giao thức test dùng chung, không phát hiện khác biệt giữa teacher và hybrid concat (McNemar p = 0.7266, bootstrap CI chứa 0).",
                  "Không khẳng định hai mô hình tương đương một cách tổng quát. 'Không phát hiện khác biệt' không phải là 'bằng nhau'.",
                ],
                [
                  "Đầu LR trên embedding đóng băng giữ 99.78% macro-F1 của teacher, fit lại nhanh 45.1 lần, file head chỉ 0.089 MB.",
                  "Không khẳng định suy luận nhanh hơn. Latency end-to-end vẫn 8.394 ms so với 8.291 ms của teacher, vì backbone vẫn chạy.",
                ],
                [
                  "Nhánh đặc trưng thủ công chỉ chiếm 0.8% tổng importance SHAP; đứng riêng chỉ đạt 0.8151.",
                  "Không khẳng định đặc trưng thủ công vô dụng — nó vẫn có giá trị làm kênh giải thích cho cán bộ nông nghiệp.",
                ],
                [
                  "Zero-shot sang một bộ Việt Nam độc lập: teacher rơi từ 0.9889 xuống 0.3782 trên 4 lớp chung.",
                  "Không khẳng định đây là quy luật chuyển vườn. Đây là MỘT bộ đích, MỘT lần kiểm tra, không phải benchmark đa site.",
                ],
                [
                  "92.9% lỗi còn lại dính Blight và Colletotrichum; class weighting, focal loss, augmentation đều không sửa được.",
                  "Không khẳng định không có cách nào sửa được. Chỉ khẳng định ba cách đã thử, trong protocol này, không ăn.",
                ],
              ]}
            />

            <Callout tone="danger" title="Cái bẫy số 1 — nói sai bản chất đóng góp">
              <Text size="small">
                Nếu hội đồng hỏi "Đóng góp mới của em là gì?", câu trả lời KHÔNG phải là "em đề xuất
                mô hình frozen-backbone" (cái đó có từ lâu rồi). Câu trả lời đúng là: <b>em đo và kiểm
                định một cách tường minh cái chi phí cập nhật mà các bài khác bỏ qua, và em chứng minh
                bằng kiểm định thống kê rằng việc đổi kiến trúc hybrid không tạo ra khác biệt thật</b>.
                Đây là đóng góp về <i>giao thức đánh giá</i>, không phải về kiến trúc.
              </Text>
            </Callout>

            <H3>5 đóng góp, dịch ra tiếng người</H3>
            <Table
              headers={["#", "Đóng góp trong bài", "Nói lại cho dễ hiểu"]}
              rows={[
                [
                  "1",
                  "Benchmark tái lập được trên split của tác giả dữ liệu, báo cáo mean ± std trên 3 seed, cộng 5 lần xáo trộn tập train trên test cố định.",
                  "Người khác tải đúng bộ dữ liệu, chạy đúng lệnh, sẽ ra đúng số của mình. Và số đó không phải ăn may một lần chạy.",
                ],
                [
                  "2",
                  "So sánh ba hướng dưới cùng một giao thức: fine-tune cả mạng, head trên embedding đóng băng, và mô hình cổ điển dùng đặc trưng thủ công.",
                  "Ba họ mô hình được so công bằng: cùng split, cùng metric, cùng cách chọn cấu hình theo validation.",
                ],
                [
                  "3",
                  "Kiểm định thống kê tường minh: McNemar exact, one-vs-rest từng lớp, bootstrap CI 2000 lần.",
                  "Không so kiểu '0.9207 thấp hơn 0.9255 nên CNN thắng'. Phải hỏi: chênh lệch đó có lớn hơn nhiễu hay không?",
                ],
                [
                  "4",
                  "Đo chi phí cập nhật: thời gian fit lại head trên embedding đã cache, kích thước file head, latency end-to-end.",
                  "Chỉ ra lợi ích nằm ở đâu và KHÔNG nằm ở đâu. Đây là phần trung thực nhất của bài.",
                ],
                [
                  "5",
                  "Phân tích lỗi: lỗi dồn vào Blight và Colletotrichum, và ba biện pháp chữa chuẩn đều thất bại.",
                  "Một kết quả âm được báo cáo tử tế, kèm suy luận về nguyên nhân (thiếu nhãn cấp tổn thương, không phải mất cân bằng lớp).",
                ],
              ]}
            />
          </Stack>
        </ReportSection>

        {/* ================= 2. PHIẾU DỰ ĐOÁN ================= */}
        <ReportSection
          title="2. Phiếu dự đoán trước khi đọc"
          description="Làm phần này TRƯỚC. Viết dự đoán của em, rồi mới mở đáp án. Đây là cách học tạo ra khoảnh khắc 'à, hoá ra là vậy'."
          meta="8 câu · khoảng 30 phút"
          divided
        >
          <Stack gap="sectionCompact">
            <Callout tone="warning" title="Luật chơi">
              <Text size="small">
                Không mở bài báo, không mở các mục sau của tài liệu này. Chỉ dùng những gì em đã biết
                từ Đồ án tốt nghiệp. Viết cả <b>lý do</b> em đoán như vậy — vì khi đối chiếu đáp án,
                chính cái lý do sai mới là thứ em cần sửa. Ô nhập liệu được lưu lại, em có thể làm dở
                rồi quay lại sau.
              </Text>
            </Callout>

            <Stack gap="container">
              <PredictionBox
                code="P1"
                question="Nếu đóng băng backbone MobileNetV2 đã fine-tune, rồi chỉ học một lớp logistic regression trên embedding 1280 chiều, macro-F1 trên test sẽ ra sao so với fine-tune cả mạng?"
                value={predictions["P1"] || ""}
                onChange={(v) => setPrediction("P1", v)}
                revealed={isOpen("P1")}
                onToggle={() => toggle("P1")}
                answer={
                  <Stack gap="inline">
                    <Text size="small">
                      Gần như ngang nhau. Frozen LR đạt <b>0.9235</b>, teacher ở seed được chọn (42)
                      đạt <b>0.9255</b> — tức giữ <b>99.78%</b>.
                    </Text>
                    <Text size="small" tone="secondary">
                      Điểm tinh tế: nếu em so 0.9235 với <b>trung bình 3 seed</b> của teacher là 0.9088
                      thì em sẽ kết luận sai rằng frozen LR "thắng" teacher. Hai con số đó không cùng
                      một kiểu đo: 0.9255 là một seed được chọn theo validation, còn 0.9088 là trung
                      bình 3 seed. So sánh đúng cặp là 0.9255 với 0.9235.
                    </Text>
                    <Text size="small" tone="secondary">
                      Vì sao lại ngang nhau? Vì backbone đã được fine-tune trên chính bộ dữ liệu này,
                      embedding 1280 chiều đã tách lớp đủ tốt; phần việc còn lại của đầu phân loại chỉ
                      là vẽ một mặt phẳng quyết định, và với 6 lớp đã gần như tách được thì mặt phẳng
                      đó là đủ.
                    </Text>
                  </Stack>
                }
              />

              <PredictionBox
                code="P2"
                question="Ghép thêm 71 đặc trưng thủ công (màu, histogram, texture, shape) vào embedding 1280 chiều thì độ chính xác sẽ tăng, giảm hay không đổi? Vì sao?"
                value={predictions["P2"] || ""}
                onChange={(v) => setPrediction("P2", v)}
                revealed={isOpen("P2")}
                onToggle={() => toggle("P2")}
                answer={
                  <Stack gap="inline">
                    <Text size="small">
                      <b>Không tăng.</b> Concat LR đạt 0.9207, thấp hơn embedding-only 0.9235 một
                      chút (Δ = −0.0028). Còn đặc trưng thủ công đứng một mình chỉ đạt 0.8151 với
                      XGBoost — kém hơn 0.1084 so với frozen tốt nhất.
                    </Text>
                    <Text size="small" tone="secondary">
                      Và trong bảng đầy đủ S4, không có head nào được lợi đáng kể từ việc ghép thêm:
                      random forest +0.0024, LightGBM +0.0001, XGBoost +0.0000, logistic regression
                      −0.0028. Tức là kết quả này không phải do chọn nhầm head.
                    </Text>
                    <Text size="small" tone="secondary">
                      Bằng chứng mạnh nhất: SHAP cho thấy nhánh thủ công chỉ chiếm <b>0.8%</b> tổng
                      importance, nhánh embedding chiếm 99.2%. Thêm 71 chiều vào 1280 chiều chủ yếu
                      là thêm nhiễu và thêm tham số phải ước lượng, trong khi thông tin thì đã có sẵn
                      trong embedding.
                    </Text>
                    <Text size="small" tone="secondary">
                      Nhưng đừng kết luận "đặc trưng thủ công vô dụng". Bài vẫn giữ nó, với vai trò
                      khác: <b>kênh giải thích</b>. Những đặc trưng xếp hạng cao nhất là độ sáng lá,
                      số tổn thương, bin histogram độ bão hoà, solidity — đều là thứ cán bộ nông
                      nghiệp nhìn bằng mắt kiểm chứng được, còn chỉ số chiều embedding thứ 743 thì không.
                    </Text>
                  </Stack>
                }
              />

              <PredictionBox
                code="P3"
                question="Mang mô hình đã train sang một bộ ảnh sầu riêng Việt Nam khác (vườn khác, máy khác), KHÔNG train lại, chỉ đánh giá trên 4 lớp chung. Em đoán macro-F1 rơi xuống khoảng bao nhiêu?"
                value={predictions["P3"] || ""}
                onChange={(v) => setPrediction("P3", v)}
                revealed={isOpen("P3")}
                onToggle={() => toggle("P3")}
                answer={
                  <Stack gap="inline">
                    <Text size="small">
                      Rơi rất mạnh, mạnh hơn đa số mọi người đoán: <b>0.9889 xuống 0.3782</b>, tức
                      Δ = −0.6107. Balanced accuracy rơi từ 0.9889 xuống 0.4199. Head đóng băng cũng
                      rơi y hệt (0.9850 xuống 0.3811).
                    </Text>
                    <Text size="small" tone="secondary">
                      Việc head đóng băng rơi tương tự là một manh mối quan trọng: nếu chỉ đổi đầu
                      phân loại thì không cứu được. Vấn đề nằm ở <b>biểu diễn</b> (representation),
                      không phải ở đầu ra.
                    </Text>
                    <Text size="small" tone="secondary">
                      Nhưng phải nói đúng giới hạn của thí nghiệm: bộ đích khác bộ nguồn ở <b>nhiều
                      thứ cùng lúc</b> — vườn, thiết bị chụp, cách lấy khung hình, tiền xử lý, và ảnh
                      đích được phát hành ở độ phân giải nhỏ cố định. Nên con số 0.3782 đo <b>tổng hợp</b>
                      các dịch chuyển đó, và bài KHÔNG quy được nguyên nhân cho bất kỳ yếu tố đơn lẻ nào.
                    </Text>
                  </Stack>
                }
              />

              <PredictionBox
                code="P4"
                question="Trong 6 lớp (Algal, Blight, Colletotrichum, Healthy, Phomopsis, Rhizoctonia), em đoán lớp nào khó nhất và vì sao?"
                value={predictions["P4"] || ""}
                onChange={(v) => setPrediction("P4", v)}
                revealed={isOpen("P4")}
                onToggle={() => toggle("P4")}
                answer={
                  <Stack gap="inline">
                    <Text size="small">
                      <b>Blight (0.7851)</b> và <b>Colletotrichum (0.8021)</b> — đây là F1 trung bình
                      qua 5 lần xáo trộn tập train (Table S1). Ở seed 42 trên test thì Blight = 0.8333
                      và Colletotrichum = 0.8421. Bốn lớp còn lại đều trên 0.91; Healthy và Algal gần
                      như hoàn hảo (0.9753 và 0.9701).
                    </Text>
                    <Text size="small" tone="secondary">
                      Lý do: cả hai đều là bệnh lý <b>tổn thương hoại tử</b> (necrotic lesion), khác
                      nhau chủ yếu ở viền tổn thương và màu sắc. Ba cặp nhầm lớn nhất là
                      Colletotrichum → Blight (8 ảnh), Blight → Colletotrichum (6 ảnh), Blight →
                      Rhizoctonia (5 ảnh). Nhầm theo <b>cả hai chiều</b>, tức là mơ hồ thật sự chứ
                      không phải thiên lệch một phía.
                    </Text>
                    <Text size="small" tone="secondary">
                      Blight còn có độ lệch chuẩn fold-to-fold lớn nhất (± 0.0359, khoảng 0.7377 đến
                      0.8308) — nghĩa là nó không chỉ yếu mà còn <b>không ổn định</b>.
                    </Text>
                  </Stack>
                }
              />

              <PredictionBox
                code="P5"
                question="Nếu hai lớp đó yếu, em nghĩ class weighting / focal loss / augmentation có sửa được không? Và nguyên nhân gốc của việc chúng yếu là gì?"
                value={predictions["P5"] || ""}
                onChange={(v) => setPrediction("P5", v)}
                revealed={isOpen("P5")}
                onToggle={() => toggle("P5")}
                answer={
                  <Stack gap="inline">
                    <Text size="small">
                      <b>Không sửa được.</b> Không can thiệp nào cải thiện macro-F1 trung bình; can
                      thiệp tốt nhất chỉ thay đổi −0.0038, nằm gọn trong một độ lệch chuẩn của baseline
                      (0.0119). Và hiệu ứng từng lớp thì bù trừ nhau: weighted làm giảm cả Blight lẫn
                      Colletotrichum; focal tăng Colletotrichum nhưng giảm Blight; augmented tăng
                      Blight nhưng giảm Colletotrichum. <b>Không cấu hình nào tăng được cả hai lớp
                      cùng lúc.</b>
                    </Text>
                    <Text size="small" tone="secondary">
                      Nguyên nhân gốc KHÔNG phải mất cân bằng lớp. Bằng chứng: trọng số inverse-frequency
                      chỉ trải trong khoảng <b>0.89 đến 1.08</b>, và lớp lớn nhất chỉ gấp <b>1.22 lần</b>
                      lớp nhỏ nhất. Hai lớp yếu là lớp <b>cỡ trung bình</b>, không phải lớp thiểu số.
                      Nên đây là giới hạn của <b>supervision</b> — cần nhãn cấp tổn thương (lesion-level)
                      hoặc thêm dữ liệu thực địa cho hai bệnh này, chứ không phải đổi hàm mất mát hay
                      đổi cách lấy mẫu.
                    </Text>
                    <Text size="small" tone="secondary">
                      Thêm một bằng chứng hỗ trợ: Grad-CAM trên các ảnh sai cho thấy activation vẫn tập
                      trung đúng vào tổn thương và viền của nó, không phải vào nền hay cấu trúc lá không
                      liên quan. Tức là mô hình <b>nhìn đúng chỗ</b> nhưng vẫn phân biệt sai — đây là
                      mơ hồ thị giác giữa hai bệnh, không phải lỗi định vị. Lưu ý nói đúng mức: Grad-CAM
                      là bằng chứng <b>định tính</b>, bài không đọc nhiều hơn thế từ nó.
                    </Text>
                  </Stack>
                }
              />

              <PredictionBox
                code="P6"
                question="Đầu phân loại đóng băng giảm được chi phí nào: thời gian train lại, kích thước file, hay tốc độ suy luận một ảnh?"
                value={predictions["P6"] || ""}
                onChange={(v) => setPrediction("P6", v)}
                revealed={isOpen("P6")}
                onToggle={() => toggle("P6")}
                answer={
                  <Stack gap="inline">
                    <Text size="small">
                      Giảm được <b>thời gian cập nhật</b> và <b>kích thước file</b>. KHÔNG giảm được
                      tốc độ suy luận.
                    </Text>
                    <Table
                      headers={["Đại lượng", "Teacher", "Frozen LR", "Đọc thế nào"]}
                      rows={[
                        ["Test macro-F1", "0.9255", "0.9235", "Giữ 99.78%"],
                        ["Thời gian train / fit lại", "57.7 s", "1.28 s", "Nhanh 45.1 lần"],
                        ["Latency head-only", "—", "0.103 ms", "Chỉ tính riêng head, bỏ qua backbone"],
                        ["Latency end-to-end", "8.291 ms", "8.394 ms", "Gần như không đổi, thậm chí nhỉnh hơn"],
                        ["Kích thước file", "8.748 MB", "0.089 MB", "Head nhẹ hơn ~98 lần"],
                      ]}
                      rowTone={["default", "success", "default", "danger", "success"]}
                    />
                    <Text size="small" tone="secondary">
                      Đây là chỗ <b>dễ bị hiểu sai nhất cả bài</b>, và chính người viết bản thảo cũng
                      đã đánh dấu nó là chỗ lo nhất. Vì head nhận đầu vào là embedding, nên khi dự đoán
                      một ảnh vẫn phải chạy backbone trước — latency end-to-end do backbone chi phối.
                      Nói "mô hình nhẹ hơn nên chạy nhanh hơn" là <b>sai</b> và sẽ bị bắt ngay.
                    </Text>
                    <Text size="small" tone="secondary">
                      Nói đúng: "Lợi ích đo được là chi phí của một lần <b>cập nhật</b> — khi nhãn mới
                      xuất hiện hoặc khi chuyển vườn, ta chỉ cần fit lại head trên embedding đã cache,
                      mất 1.28 giây và 0.089 MB, thay vì fine-tune cả mạng mất 57.7 giây và 8.748 MB."
                    </Text>
                  </Stack>
                }
              />

              <PredictionBox
                code="P7"
                question="McNemar cho p = 0.7266. Vậy có được kết luận 'hai mô hình tương đương nhau' không?"
                value={predictions["P7"] || ""}
                onChange={(v) => setPrediction("P7", v)}
                revealed={isOpen("P7")}
                onToggle={() => toggle("P7")}
                answer={
                  <Stack gap="inline">
                    <Text size="small">
                      <b>Không.</b> Đây là lỗi suy luận kinh điển trong ML: p lớn nghĩa là
                      <b>không phát hiện được khác biệt</b>, chứ không phải <b>đã chứng minh không có
                      khác biệt</b>. Absence of evidence is not evidence of absence.
                    </Text>
                    <Text size="small" tone="secondary">
                      Nói đúng: "Trong giao thức test cố định này, trên 394 ảnh dùng chung, chúng tôi
                      không phát hiện khác biệt giữa teacher và hybrid concat. Điều này không thiết lập
                      sự tương đương tổng quát." Bài báo viết nguyên văn ý đó, và cố tình dùng cụm
                      "in either direction" để không ai đọc lệch theo hướng nào.
                    </Text>
                    <Text size="small" tone="secondary">
                      Muốn khẳng định tương đương thì phải làm <b>equivalence test</b> (ví dụ TOST)
                      với một biên tương đương định trước. Bài này không làm vậy, nên không được nói vậy.
                    </Text>
                  </Stack>
                }
              />

              <PredictionBox
                code="P8"
                question="Nếu phải giới thiệu bài này trong đúng 2 câu với một người không chuyên, em sẽ nói gì?"
                value={predictions["P8"] || ""}
                onChange={(v) => setPrediction("P8", v)}
                revealed={isOpen("P8")}
                onToggle={() => toggle("P8")}
                answer={
                  <Stack gap="inline">
                    <Text size="small">
                      Bản tham khảo: "Chúng em đánh giá một cách tử tế xem việc đóng băng backbone và
                      chỉ huấn luyện lại đầu phân loại có giữ được độ chính xác trên ảnh lá sầu riêng
                      Việt Nam hay không, và đo luôn cái chi phí cập nhật mà các bài khác thường bỏ qua.
                      Kết quả là hiệu năng gần như không đổi và cập nhật rẻ hơn nhiều, nhưng mô hình
                      <b>không</b> chuyển sang vườn khác được nếu không thích nghi — nên chúng em nói
                      rõ giới hạn đó thay vì hứa hẹn một hệ thống dùng được ở mọi nơi."
                    </Text>
                    <Text size="small" tone="secondary">
                      Ba thứ phải có mặt trong 2 câu đó: (1) đây là bài <b>đánh giá</b>, không phải bài
                      kiến trúc mới; (2) lợi ích là <b>chi phí cập nhật</b>; (3) có <b>giới hạn chuyển
                      miền</b> được nói thẳng. Thiếu ý (3) là bài giới thiệu trở thành overclaim.
                    </Text>
                  </Stack>
                }
              />
            </Stack>

            <Divider />
            <Row gap="component" align="center" wrap>
              <SendToChatButton
                variant="primary"
                label="Gửi phiếu dự đoán cho thầy chấm"
                text={predictionDump}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPredictions({});
                  setRevealed({});
                }}
              >
                Xoá toàn bộ dự đoán và đáp án đã mở
              </Button>
              <Text size="small" tone="tertiary">
                Dự đoán và ô tick được lưu lại giữa các lần mở canvas.
              </Text>
            </Row>
          </Stack>
        </ReportSection>
        {/* ================= 3. DỮ LIỆU & GIAO THỨC ================= */}
        <ReportSection
          title="3. Dữ liệu và giao thức thí nghiệm"
          description="Section III của bài báo. Hội đồng rất hay hỏi phần này, vì protocol quyết định số có nghĩa hay không."
          divided
        >
          <Stack gap="container">
            <Stack gap="inline">
              <H3>Sơ đồ tổng thể — nhìn một lần để nắm cả bài</H3>
              <DiagramPipeline tokens={tokens} />
              <Text size="small" tone="tertiary">
                Khớp với Figure 1 của bài báo. Ba điểm cần đọc ra từ sơ đồ: (1) backbone chỉ train
                <b> một lần</b> rồi đóng băng — đây là cơ chế sinh ra lợi thế chi phí; (2) đặc trưng thủ
                công đi <b>đường riêng</b> từ ảnh, không qua CNN, và chỉ là nhánh tuỳ chọn (nét đứt);
                (3) mọi cấu hình đều được đánh giá trên <b>cùng</b> một tập test 394 ảnh.
              </Text>
            </Stack>

            <Divider />
            <H3>3.1 Bộ dữ liệu chính</H3>
            <Table
              headers={["Mục", "Giá trị", "Vì sao phải nhớ"]}
              rows={[
                ["Tên", "A Durian Leaf Image Dataset of Common Diseases in Vietnam for Agricultural Diagnosis", "Phải đọc đúng tên khi trích dẫn"],
                ["Bản ghi", "Mendeley Data, DOI 10.17632/pxzvksbwnj.4, giấy phép CC BY 4.0", "CC BY 4.0 nghĩa là được dùng lại nhưng BẮT BUỘC ghi công"],
                ["Phiên bản dùng thật", "Version 3 — file Durian_Leaf_Disease.zip, 334.201.946 byte", "Version 4 là bản mới nhất trên landing page nhưng listing rỗng ở API root, nên script fallback về version 3"],
                ["SHA-256", "5e271cfd89e8a738ef760aa48bb1081e68e0f6f2c53e689566a7920a09be8dce", "Bằng chứng em tải đúng bản, dùng để biện minh khi số lệch"],
                ["Bài mô tả dữ liệu", "Nguyen et al., Data in Brief, vol. 61, article 111845, 2025. DOI 10.1016/j.dib.2025.111845", "Trích dẫn RIÊNG với DOI bản ghi — hai thứ này là hai tài liệu khác nhau"],
                ["Cách thu thập", "iPhone 14, ánh sáng tự nhiên, vườn thương mại ở Bình Phước và Tiền Giang, tháng 1/2025", "Giải thích vì sao chỉ có 2 tỉnh, và vì sao OOD lại nhạy cảm với thiết bị chụp"],
                ["Chất lượng nhãn", "2 người gán nhãn toàn bộ trong CVAT, Cohen's kappa = 0.85; 30% ảnh được 2 kỹ sư nông nghiệp kiểm lại dưới hướng dẫn của một nhà bệnh học thực vật", "kappa 0.85 là mức 'gần như hoàn hảo'. Đây là điểm mạnh của bộ dữ liệu, nên nói ra khi bảo vệ"],
                ["Quy mô và split", "2595 ảnh, 6 lớp; train 1814 / val 387 / test 394 — split do chính tác giả dữ liệu định nghĩa, GIỮ NGUYÊN", "Không tự chia lại split. Giữ nguyên để kết quả còn so sánh được với các bài sau này trên cùng release"],
              ]}
            />

            <Table
              headers={["Lớp", "Train", "Val", "Test", "Tổng"]}
              rows={[
                ["Leaf_Algal", "323", "69", "70", "462"],
                ["Leaf_Blight", "308", "66", "66", "440"],
                ["Leaf_Colletotrichum", "280", "60", "60", "400"],
                ["Leaf_Healthy", "338", "72", "74", "484"],
                ["Leaf_Phomopsis", "287", "61", "63", "411"],
                ["Leaf_Rhizoctonia", "278", "59", "61", "398"],
                ["TỔNG", "1814", "387", "394", "2595"],
              ]}
              rowTone={["default", "warning", "warning", "default", "default", "default", "accent"]}
            />
            <Text size="small" tone="secondary">
              Hai dòng tô vàng là hai lớp khó. Chú ý: lớp lớn nhất (484) chỉ gấp <b>1.22 lần</b> lớp
              nhỏ nhất (398). Đây KHÔNG phải bài toán mất cân bằng lớp — và chính con số 1.22 này là
              bằng chứng để bác bỏ lời giải thích "hai lớp yếu vì ít dữ liệu".
            </Text>

            <Divider />
            <H3>3.2 Teacher network — và vì sao chọn như vậy</H3>
            <Table
              headers={["Thành phần", "Cấu hình", "Lý do thiết kế (phải nói được)"]}
              rows={[
                ["Kiến trúc", "MobileNetV2, khởi tạo từ ImageNet, thay head bằng lớp tuyến tính 6 lớp, input 224×224", "Nhỏ (2.232M tham số, 8.75 MB) nên hợp với phần cứng nông hộ. Bài KHÔNG chạy architecture search — cố tình, để không lẫn đóng góp protocol với đóng góp kiến trúc"],
                ["Optimizer", "AdamW, lr = 0.001, weight decay = 0.0001, cosine annealing", "Cấu hình chuẩn, không tinh chỉnh đặc biệt — để baseline là một baseline công bằng"],
                ["Lịch train", "batch 32, tối đa 25 epoch, early stopping theo validation macro-F1, patience 5, mixed precision trên CUDA", "Early stopping theo VAL chứ không theo TEST. Đây là ranh giới chống leakage, phải nói rõ"],
                ["Augmentation", "CỐ TÌNH nhẹ: random resized crop scale [0.8, 1.0], lật ngang, colour jitter nhẹ (brightness/contrast/saturation = 0.1)", "Để baseline không bị nhiễu bởi việc tìm augmentation. Nếu augment mạnh rồi so sánh thì không biết chênh lệch đến từ pipeline hay từ augmentation"],
                ["Seed", "42, 43, 44. Seed dùng cho trích xuất đặc trưng được chọn THEO VALIDATION macro-F1", "Chọn seed theo test là cheating. Bài báo nói rõ điều này và em phải nhắc lại khi bị hỏi"],
              ]}
            />

            <Divider />
            <H3>3.3 Pipeline frozen-backbone và 71 đặc trưng thủ công</H3>
            <Text size="small">
              Sau khi train, backbone bị đóng băng và chỉ dùng làm bộ trích xuất đặc trưng. Embedding
              sâu là activation <b>1280 chiều</b> của lớp penultimate. Nhánh thủ công là vector
              <b> 71 chiều</b> chia làm 4 họ:
            </Text>
            <Table
              headers={["Họ", "Số chiều", "Nội dung"]}
              rows={[
                ["Colour", "12", "Trung bình và độ lệch chuẩn từng kênh trong RGB và CIELAB"],
                ["Histogram", "24", "Histogram hue 16 bin và saturation 8 bin"],
                ["Texture", "22", "GLCM (contrast, dissimilarity, homogeneity, energy, correlation, ASM) ở 2 offset; histogram LBP dạng uniform"],
                ["Shape", "13", "Từ phân ngưỡng Otsu trên kênh a*: tỉ lệ diện tích lá, solidity, extent, aspect ratio, chu vi chuẩn hoá, circularity, eccentricity, tỉ lệ diện tích tổn thương, số tổn thương, mật độ cạnh, độ sáng nền và lá"],
              ]}
            />
            <Text size="small" tone="secondary">
              Ba tập đặc trưng (chỉ thủ công / chỉ embedding / ghép cả hai) được ghép với bốn head
              (LightGBM, XGBoost, random forest, logistic regression đa thức có chuẩn hoá đặc trưng).
              Tổng cộng <b>12 cấu hình hybrid</b>, tất cả nằm ở Table S4. Head tree dùng validation
              để early stopping.
            </Text>

            <Divider />
            <H3>3.4 Metric và cách chọn mô hình</H3>
            <Grid columns={2} gap="component" minColumnWidth={280}>
              <Callout tone="info" title="Vì sao là macro-F1 chứ không phải accuracy">
                <Text size="small">
                  Hai lý do, phải nói được cả hai. (1) Sáu lớp có kích thước <b>gần bằng nhưng không
                  bằng nhau</b>, nên accuracy sẽ bị lệch nhẹ về lớp lớn. (2) Quan trọng hơn: thứ cần
                  về mặt nông học là <b>recall từng lớp</b> — bỏ sót một bệnh có khả năng lây lan
                  nhanh thì đắt hơn nhiều so với việc báo nhầm. Macro-F1 trung bình F1 từng lớp với
                  trọng số ngang nhau, nên nó phạt nặng việc bỏ sót một lớp.
                </Text>
              </Callout>
              <Callout tone="warning" title="Ranh giới val / test">
                <Text size="small">
                  <b>Mọi</b> quyết định chọn mô hình — chọn seed backbone, chọn cấu hình hybrid —
                  đều dùng <b>validation</b>. Test chỉ được đọc <b>một lần duy nhất</b> để báo cáo
                  cuối. Nếu em bị hỏi "làm sao biết em không chọn theo test?", câu trả lời là:
                  seed 42 được chọn vì nó có val macro-F1 cao nhất (0.9458), không phải vì test cao nhất.
                </Text>
              </Callout>
            </Grid>
            <Stack gap="inline">
              <DiagramProtocol tokens={tokens} />
              <Text size="small" tone="tertiary">
                Thanh ngang màu vàng phía dưới là <b>pool train + val 2201 ảnh</b>: bài rút 5 fold
                stratified từ pool này và huấn luyện 5 lần, nhưng mũi tên xanh ngắt quãng nhấn mạnh rằng
                tập test <b>không bị đụng tới</b>. Đó là lý do không được gọi đây là cross-validation
                theo nghĩa thông thường — xem phụ lục thống kê ở mục 5.
              </Text>
            </Stack>
            <Text size="small">
              Ba phép kiểm định bổ sung: <b>McNemar exact binomial</b> trên tính đúng/sai từng ảnh,
              <b> cùng phép đó theo kiểu one-vs-rest cho từng lớp</b>, và <b>bootstrap 2000 lần</b>
              cho khoảng tin cậy của hiệu macro-F1. Ngoài ra có seed-paired t-test nhưng bài tự ghi
              rõ là <b>power thấp</b> vì chỉ có 3 cặp.
            </Text>
          </Stack>
        </ReportSection>

        {/* ================= 4. TABLE 3 ================= */}
        <ReportSection
          title="4. Table 3 — So sánh bốn họ mô hình"
          description="Bảng quan trọng nhất về mặt hiệu năng. Cũng là bảng dễ bị đọc sai nhất."
          meta="Section IV.A"
          divided
        >
          <Stack gap="container">
            <Table
              headers={["Họ mô hình", "Head tốt nhất", "Đặc trưng (dim)", "Val macro-F1", "Test macro-F1", "Test bal. acc."]}
              rows={[
                ["End-to-end CNN", "MobileNetV2", "ảnh gốc", "0.9458", "0.9255", "0.9261"],
                ["Frozen embedding", "logistic regression", "embedding (1280)", "0.9445", "0.9235", "0.9241"],
                ["Frozen + thủ công", "logistic regression", "concat (1351)", "0.9450", "0.9207", "0.9210"],
                ["Chỉ thủ công", "XGBoost", "handcrafted (71)", "0.8258", "0.8151", "0.8156"],
              ]}
              rowTone={["default", "success", "default", "danger"]}
            />

            <ChartContainer
              title="Test macro-F1 của bốn họ mô hình"
              description="Cùng tập test 394 ảnh. Mỗi họ lấy cấu hình tốt nhất chọn theo validation."
              footer="Ba họ dùng CNN gần như trùng nhau; họ cổ điển kém hơn hẳn khoảng 0.11."
              caption="Nguồn: results/model_comparison.csv và teacher_summary.json"
              ariaLabel="Biểu đồ test macro-F1 bốn họ mô hình"
            >
              <BarChart
                categories={TABLE3_CATEGORIES}
                series={[{ name: "Test macro-F1", data: TABLE3_VALUES }]}
                horizontal
                domain={[0.75, 0.95]}
                includeZero={false}
                valuePrecision={4}
                height={220}
                showLegend={false}
              />
            </ChartContainer>

            <Callout tone="danger" title="Cái bẫy số 2 — so sai cặp số">
              <Text size="small">
                Table 3 ghi teacher là <b>0.9255</b>, không phải 0.9088. Vì sao? Vì cột đó là
                <b> cấu hình được chọn theo validation</b> — tức seed 42. Còn <b>0.9088 ± 0.0119</b>
                là trung bình 3 seed và nằm ở <b>Table 4</b>, không nằm trong cột Test macro-F1 của
                Table 3. Nếu em nói "frozen LR 0.9235 thắng teacher 0.9088" là em đang so một seed
                đơn lẻ với trung bình 3 seed — một phép so không hợp lệ, và reviewer sẽ thấy ngay.
              </Text>
            </Callout>

            <DocsSection title="Bảng này thực sự nói gì">
              <Text size="small">
                Nó <b>không</b> nói hybrid thắng teacher. Nó nói ba điều: (1) trên bộ dữ liệu này,
                vector embedding của CNN <b>đã đủ</b> — thêm 71 số thủ công vào không giúp gì, thậm
                chí hơi giảm (−0.0028); (2) đặc trưng thủ công <b>không cạnh tranh được một mình</b>
                (0.8151, kém 0.1084); (3) hiệu năng <b>phụ thuộc lớp rất mạnh</b> — lớp Healthy gần
                như tách hoàn hảo, còn Blight và Colletotrichum tụt lại, và Section 4.3 sẽ mổ xẻ chuyện đó.
              </Text>
            </DocsSection>

            <CollapsibleSection title="Table S4 — lưới đầy đủ 12 cấu hình hybrid (mở khi bị hỏi chi tiết)" size="sm">
              <Table
                density="compact"
                headers={["Head", "Tập đặc trưng", "Dim", "Val", "Test", "Bal. acc.", "Δ so với chỉ embedding"]}
                rows={[
                  ["MobileNetV2", "ảnh gốc", "—", "0.9458", "0.9255", "0.9261", "—"],
                  ["logistic regression", "embedding", "1280", "0.9445", "0.9235", "0.9241", "—"],
                  ["logistic regression", "embedding + thủ công", "1351", "0.9450", "0.9207", "0.9210", "−0.0028"],
                  ["logistic regression", "chỉ thủ công", "71", "0.7950", "0.7599", "0.7588", "−0.1636"],
                  ["random forest", "embedding + thủ công", "1351", "0.9378", "0.9138", "0.9125", "+0.0024"],
                  ["random forest", "embedding", "1280", "0.9378", "0.9114", "0.9099", "—"],
                  ["random forest", "chỉ thủ công", "71", "0.8166", "0.7773", "0.7787", "−0.1341"],
                  ["LightGBM", "embedding + thủ công", "1351", "0.9267", "0.8951", "0.8937", "+0.0001"],
                  ["LightGBM", "embedding", "1280", "0.9295", "0.8950", "0.8935", "—"],
                  ["LightGBM", "chỉ thủ công", "71", "0.8270", "0.8121", "0.8128", "−0.0829"],
                  ["XGBoost", "embedding", "1280", "0.9374", "0.8931", "0.8912", "—"],
                  ["XGBoost", "embedding + thủ công", "1351", "0.9272", "0.8931", "0.8912", "+0.0000"],
                  ["XGBoost", "chỉ thủ công", "71", "0.8258", "0.8151", "0.8156", "−0.0780"],
                ]}
              />
              <Text size="small" tone="secondary">
                Bảng S4 được nhóm <b>theo head</b> chứ không xếp hạng toàn cục, để so ba tập đặc trưng
                <b> trong cùng một head</b>. Cột Δ là đại lượng trả lời trực tiếp câu hỏi "thêm đặc
                trưng thủ công có giúp không": +0.0024, +0.0001, +0.0000, −0.0028 — tất cả đều xấp xỉ 0.
                Đây là bằng chứng mạnh hơn nhiều so với chỉ nhìn một dòng trong Table 3.
              </Text>
            </CollapsibleSection>
          </Stack>
        </ReportSection>

        {/* ================= 5. TABLE 4 ================= */}
        <ReportSection
          title="5. Table 4 — Kiểm định thống kê"
          description="Phần làm nên sự khác biệt của bài này so với các bài chỉ báo cáo một con số. Cũng là phần em phải nói chính xác nhất."
          meta="Section IV.B"
          divided
        >
          <Stack gap="container">
            <Table
              headers={["Đại lượng", "Giá trị", "Đọc thế nào cho đúng"]}
              rows={[
                ["Teacher, macro-F1 test trên 3 seed", "0.9088 ± 0.0119", "Đổi seed khởi tạo (42/43/44), cùng split. Seed lẻ: 0.9255 / 0.8999 / 0.9009"],
                ["Teacher, 5 lần xáo trộn tập train, test cố định", "0.8990 ± 0.0103 (khoảng 0.8886–0.9172)", "Đổi TẬP HUẤN LUYỆN (5 fold trên pool 2201 ảnh train+val), test vẫn là 394 ảnh đó"],
                ["Hiệu giữa hai tóm tắt", "−0.0098", "Nhỏ hơn độ lệch chuẩn của cả hai ước lượng — tức chênh lệch nằm trong nhiễu"],
                ["Số ảnh teacher và hybrid bất đồng", "8 / 394 (5 ảnh chỉ teacher đúng, 3 ảnh chỉ hybrid đúng)", "Chỉ 8 ảnh trên tổng 394. Đây là con số trực quan nhất để giải thích vì sao p lớn"],
                ["McNemar exact, hai phía", "p = 0.7266", "Không có ý nghĩa ở α = 0.05. KHÔNG phát hiện khác biệt"],
                ["Bootstrap Δmacro-F1 (teacher − hybrid), 2000 lần", "+0.0050, CI 95% [−0.0094, +0.0198]", "Khoảng tin cậy CHỨA 0 — nhất quán với McNemar"],
                ["Seed-paired t-test (3 cặp)", "p = 0.1830", "Bài tự ghi chú là POWER THẤP ở n = 3. Đừng dựa vào con số này"],
              ]}
              rowTone={["default", "default", "default", "info", "warning", "warning", "muted"]}
            />

            <Callout tone="danger" title="Cái bẫy số 3 — hai chi tiết rất dễ nói sai">
              <Stack gap="inline">
                <Text size="small">
                  <b>(a) Teacher được so với hybrid CONCAT (0.9207), KHÔNG so với embedding-only (0.9235).</b>
                  Vì sao lại chọn cấu hình kém hơn để so? Vì hybrid concat là cấu hình <b>được chọn
                  theo validation</b> (val 0.9450, cao hơn val 0.9445 của embedding-only). Chọn theo
                  val là đúng protocol; nếu chọn theo test thì mới là cherry-picking.
                </Text>
                <Text size="small">
                  <b>(b) "0.8990 ± 0.0103 là kết quả 5-fold cross-validation" — câu này sai.</b>
                  Đây là 5 lần <b>xáo trộn tập huấn luyện</b> trên pool train+val, và <b>tập test vẫn
                  cố định</b> ở 394 ảnh. Nó là bằng chứng ổn định bổ sung <b>trong cùng giao thức test
                  cố định</b>, KHÔNG phải một tập test độc lập thứ hai, và không phải cross-validation
                  theo nghĩa test-set resampling. Bản thảo cũ từng viết "5-fold cross-validation" và
                  đã được sửa lại cho chính xác — em đừng dùng lại cách nói cũ.
                </Text>
              </Stack>
            </Callout>

            <Stack gap="inline">
              <H3>Luồng suy luận: từ con số tới câu được phép nói</H3>
              <DiagramStats tokens={tokens} />
              <Text size="small" tone="tertiary">
                Sơ đồ này là thứ em nên vẽ lại trên giấy trước khi thuyết trình. Nó cho thấy vì sao hai
                nhánh kết luận lại tách ra: cùng một dữ liệu, nhưng một bên là phát biểu hợp lệ, một bên
                là suy diễn vượt quá bằng chứng. Hội đồng thường xoáy đúng vào ranh giới này.
              </Text>
            </Stack>

            <DocsSection title="Giải thích McNemar cho người không học thống kê">
              <Text size="small">
                McNemar là phép kiểm định cho <b>dữ liệu ghép cặp</b>. Ở đây mỗi ảnh test là một cặp:
                teacher đúng hay sai, và hybrid đúng hay sai. Có bốn ô: cả hai cùng đúng, cả hai cùng
                sai, chỉ teacher đúng, chỉ hybrid đúng. <b>Hai ô đầu không mang thông tin</b> về sự
                khác biệt — chỉ hai ô sau (gọi là <b>discordant</b>) mới quan trọng.
              </Text>
              <Text size="small">
                Ở bài này: 5 ảnh chỉ teacher đúng, 3 ảnh chỉ hybrid đúng. Tổng 8 ảnh bất đồng. Câu hỏi
                McNemar trả lời là: <b>nếu hai mô hình thực sự ngang nhau, thì xác suất để thấy sự phân
                bố lệch 5-3 (hoặc lệch hơn) chỉ do ngẫu nhiên là bao nhiêu?</b> Với 8 lần tung đồng xu
                mà được 5 mặt ngửa thì chuyện đó quá bình thường — nên p = 0.7266. Không có gì để kết luận.
              </Text>
              <Text size="small" tone="secondary">
                Nói một câu dễ nhớ khi thuyết trình: "Hai mô hình chỉ khác nhau ở 8 trên 394 ảnh. Với
                một chênh lệch nhỏ như vậy, bất kỳ ai cũng có thể đúng tuỳ lần chạy — nên chúng em
                không tuyên bố mô hình nào tốt hơn."
              </Text>
            </DocsSection>

            <DocsSection title="Bootstrap CI đọc thế nào">
              <Text size="small">
                Bootstrap 2000 lần: lấy mẫu lại <b>có hoàn lại</b> từ 394 ảnh test, mỗi lần tính lại
                hiệu macro-F1 giữa hai mô hình, rồi lấy phân vị 2.5% và 97.5% làm khoảng tin cậy.
                Kết quả [−0.0094, +0.0198] <b>chứa 0</b>, nghĩa là dữ liệu không loại trừ khả năng
                hai mô hình bằng nhau, và cũng không loại trừ khả năng hybrid tốt hơn một chút.
              </Text>
              <Text size="small">
                Khoảng này còn cho biết <b>độ lớn</b>: toàn bộ khoảng chỉ trải trong ±0.02 macro-F1 —
                dữ liệu nhất quán với khả năng hybrid kém teacher 0.0094 và cũng nhất quán với khả năng
                hybrid tốt hơn 0.0198. Cả hai đều dưới 2 điểm phần trăm, trong khi riêng độ lệch chuẩn
                giữa các seed của teacher đã là 0.0119. Đây chính là luận điểm phương pháp luận của bài:
                <b> một nghiên cứu chỉ chạy hybrid một lần và end-to-end một lần trên bộ dữ liệu này
                hoàn toàn có thể báo cáo một "cải thiện" theo bất kỳ hướng nào</b>. Vì vậy bài hybrid
                nên kèm kiểm định ý nghĩa, không nên chỉ báo cáo hiệu hai điểm ước lượng.
              </Text>
            </DocsSection>

            <Callout tone="success" title="Câu nên nói nguyên văn khi bị hỏi về ý nghĩa thống kê">
              <Text size="small">
                "Trong giao thức test cố định này, chúng em <b>không phát hiện</b> khác biệt giữa
                teacher và hybrid concat. Kết quả này là bằng chứng cho một <b>khoảng cách quan sát
                được rất nhỏ</b>, chứ <b>không thiết lập</b> sự tương đương tổng quát hay sự vượt trội
                theo bất kỳ hướng nào."
              </Text>
            </Callout>
            <CollapsibleSection
              title="Phụ lục thống kê — đọc nếu phần trên làm em rối"
              size="sm"
              defaultOpen={false}
            >
              <Stack gap="component">
                <DocsSection title="p-value là gì (giải thích bằng đúng con số của bài)">
                  <Text size="small">
                    p-value trả lời câu hỏi: <b>"Nếu hai mô hình thực sự NGANG NHAU, thì xác suất quan
                    sát được dữ liệu lệch như thế này — hoặc lệch hơn — chỉ do ngẫu nhiên là bao nhiêu?"</b>
                  </Text>
                  <Text size="small">
                    Áp vào bài: giả sử teacher và hybrid ngang nhau thật, thì mỗi ảnh bất đồng giống
                    như một lần tung đồng xu cân bằng (mô hình nào đúng là ngẫu nhiên 50/50). Ta quan
                    sát được 8 lần tung, ra 5 mặt "teacher" và 3 mặt "hybrid". Xác suất để đồng xu cân
                    bằng cho ra kết quả lệch 5-3 hoặc lệch hơn là <b>0.7266</b>. Tức là chuyện này cực
                    kỳ bình thường. Nên ta không có lý do gì để nói hai mô hình khác nhau.
                  </Text>
                  <Text size="small" tone="secondary">
                    Ngược lại, nếu ta thấy 8 lần tung mà ra 8-0, thì p sẽ rất nhỏ (0.0078) và ta mới có
                    quyền nói có khác biệt. Đây là cách giúp em "cảm" được p-value mà không cần công thức.
                  </Text>
                </DocsSection>

                <DocsSection title="Power (lực kiểm định) — vì sao bài tự nhận là thấp">
                  <Text size="small">
                    Power là <b>xác suất phép kiểm định PHÁT HIỆN được khác biệt NẾU khác biệt đó có
                    thật</b>. Power phụ thuộc chủ yếu vào <b>cỡ mẫu</b>. Cỡ mẫu càng nhỏ, power càng thấp.
                  </Text>
                  <Text size="small">
                    Bài này có hai chỗ power thấp. (1) McNemar chỉ dùng <b>8 ảnh bất đồng</b> — với 8
                    lần tung, ngay cả kết quả lệch 7-1 cũng chỉ cho p ≈ 0.07, vẫn chưa qua ngưỡng 0.05.
                    Muốn p nhỏ hơn 0.05 thì cần lệch cỡ 8-0. Nghĩa là phép kiểm định này gần như
                    <b> không có khả năng</b> phát hiện một khác biệt nhỏ. (2) Seed-paired t-test chỉ có
                    <b> 3 cặp</b>, và chính bài ghi chú "power thấp" ngay trong Table 4.
                  </Text>
                  <Text size="small" weight="semibold">
                    Hệ quả phải nói ra được: p lớn ở đây KHÔNG phải bằng chứng mạnh cho sự tương đương.
                    Nó chỉ nói "không đủ dữ liệu để kết luận". Đó chính xác là lý do bài dùng ngôn ngữ
                    "không phát hiện khác biệt" chứ không dùng "tương đương".
                  </Text>
                </DocsSection>

                <DocsSection title="Equivalence test / TOST — thứ CẦN làm nếu muốn nói 'tương đương'">
                  <Text size="small">
                    TOST viết tắt của <b>Two One-Sided Tests</b>. Cách làm: trước khi chạy, ta định
                    nghĩa một <b>biên tương đương</b> (equivalence margin) — ví dụ "hai mô hình được coi
                    là tương đương nếu macro-F1 chênh nhau không quá 0.02". Sau đó ta kiểm định xem
                    <b> toàn bộ</b> khoảng tin cậy 90% của hiệu có nằm gọn trong khoảng [−0.02, +0.02]
                    hay không. Nếu có, ta được phép kết luận tương đương <b>trong biên đã định nghĩa</b>.
                  </Text>
                  <Text size="small">
                    Bài này <b>không</b> làm TOST, nên không được nói tương đương. Nhưng em có thể dùng
                    ý đó để trả lời rất hay nếu bị hỏi: "Với CI 95% là [−0.0094, +0.0198], nếu chọn biên
                    tương đương là ±0.02 thì về mặt số học khoảng này gần như nằm gọn trong biên — nhưng
                    chúng em KHÔNG tuyên bố tương đương vì chưa đăng ký biên trước và chưa chạy TOST.
                    Chúng em chỉ nói không phát hiện khác biệt." Câu đó vừa chính xác vừa cho thấy em
                    hiểu sâu hơn yêu cầu.
                  </Text>
                  <Text size="small" tone="secondary">
                    Chọn biên tương đương thế nào là một quyết định <b>theo ngữ cảnh ứng dụng</b>, không
                    phải thống kê thuần: phải hỏi "chênh lệch bao nhiêu thì không còn ý nghĩa với cán bộ
                    khuyến nông?" — thường dựa vào chi phí của một lần phun thuốc sai hoặc một ca bệnh bỏ sót.
                  </Text>
                </DocsSection>

                <DocsSection title="Bootstrap và 'phân vị 2.5% / 97.5%'">
                  <Text size="small">
                    Bootstrap làm như sau: từ 394 ảnh test, lấy mẫu <b>có hoàn lại</b> 394 ảnh (một ảnh
                    có thể được chọn nhiều lần, có ảnh không được chọn). Tính hiệu macro-F1 trên mẫu đó.
                    Lặp lại <b>2000 lần</b>, ta được 2000 giá trị hiệu. Sắp xếp chúng tăng dần, lấy giá
                    trị ở vị trí thứ 2.5% và thứ 97.5% làm hai đầu khoảng tin cậy.
                  </Text>
                  <Text size="small">
                    Vì sao 2000 lần là đủ? Vì ta chỉ cần ước lượng hai đầu khoảng tin cậy ở mức 95%. Với
                    2000 lần lặp, sai số Monte Carlo của chính hai đầu đó đã đủ nhỏ so với độ rộng khoảng
                    (rộng 0.0292) cho mục đích báo cáo. Nếu cần CI ở mức 99%, hoặc cần hai đầu khoảng ổn
                    định hơn, thì nên tăng số lần lặp. Ý tưởng cốt lõi: bootstrap mô phỏng câu hỏi "nếu ta
                    thu thập lại 394 ảnh test khác thì hiệu này sẽ dao động trong khoảng nào".
                  </Text>
                  <Text size="small" tone="secondary">
                    Giá trị của CI so với p-value: CI cho biết <b>ĐỘ LỚN</b> chứ không chỉ có/không ý
                    nghĩa. Đọc cụ thể khoảng [−0.0094, +0.0198]: dữ liệu nhất quán với khả năng hybrid kém
                    teacher tới 0.0094, và cũng nhất quán với khả năng hybrid tốt hơn tới 0.0198. Toàn bộ
                    khoảng nằm trong ±0.02 macro-F1 — tức dưới 2 điểm phần trăm. So với riêng độ lệch chuẩn
                    giữa các seed của teacher đã là 0.0119, thì mọi kịch bản trong khoảng này đều
                    <b> không đủ lớn để đổi quyết định thực tế</b>: một trạm khuyến nông vẫn nên chọn fit
                    lại head (1.28 s, 0.089 MB) thay vì fine-tune cả mạng (57.7 s, 8.748 MB). Đó là lý do
                    bài lập luận theo hướng chi phí chứ không theo hướng "mô hình nào tốt hơn".
                  </Text>
                </DocsSection>

                <DocsSection title="One-vs-rest: kết quả cụ thể từng lớp (bài chỉ nói gọn, em nên biết chi tiết)">
                  <Table
                    density="compact"
                    headers={["Lớp", "Chỉ teacher đúng", "Chỉ hybrid đúng", "Bất đồng", "p", "F1 teacher", "F1 hybrid"]}
                    rows={[
                      ["Leaf_Algal", "0", "0", "0", "1.0000", "0.9714", "0.9714"],
                      ["Leaf_Blight", "6", "2", "8", "0.2891", "0.8333", "0.8030"],
                      ["Leaf_Colletotrichum", "1", "2", "3", "1.0000", "0.8421", "0.8522"],
                      ["Leaf_Healthy", "0", "1", "1", "1.0000", "0.9933", "1.0000"],
                      ["Leaf_Phomopsis", "0", "2", "2", "0.5000", "0.9683", "0.9841"],
                      ["Leaf_Rhizoctonia", "5", "1", "6", "0.2188", "0.9449", "0.9134"],
                    ]}
                  />
                  <Text size="small">
                    <b>Không lớp nào</b> đạt ý nghĩa ở α = 0.05, kể cả hai lớp khó Blight và
                    Colletotrichum. Đó là điều bài khẳng định khi viết "per-class one-versus-rest tests
                    do not detect a difference for any class".
                  </Text>
                  <Text size="small" tone="secondary">
                    Hai chi tiết nên biết để không bị bất ngờ: (1) Tổng số bất đồng one-vs-rest là 20,
                    LỚN HƠN 8 của phép tổng thể — vì một ảnh bị nhầm từ lớp A sang lớp B sẽ được tính là
                    bất đồng cho CẢ HAI lớp trong phép one-vs-rest. Hai con số này đo hai thứ khác nhau,
                    không mâu thuẫn. (2) Teacher nhỉnh hơn ở Blight (0.8333 so với 0.8030) và Rhizoctonia
                    (0.9449 so với 0.9134), hybrid nhỉnh hơn ở Colletotrichum, Healthy và Phomopsis —
                    tức hiệu ứng từng lớp <b>trái chiều nhau và triệt tiêu</b>, đúng tinh thần "in either
                    direction".
                  </Text>
                </DocsSection>

                <DocsSection title="Gọi tên đúng cho '5 lần xáo trộn tập huấn luyện'">
                  <Text size="small">
                    Nếu bị hỏi "vậy nó CÓ phải cross-validation không?", câu trả lời chính xác là:
                  </Text>
                  <Callout tone="info" title="Nói như thế này">
                    <Text size="small">
                      "Về <b>cơ chế chia</b> thì đó là 5-fold stratified — bài chia pool train+val (2201
                      ảnh) thành 5 fold và huấn luyện 5 lần. Nhưng về <b>giao thức đánh giá</b> thì nó
                      KHÔNG phải cross-validation theo nghĩa thông thường, vì cross-validation thường
                      đánh giá trên chính fold bị giữ ra, còn ở đây <b>mọi</b> mô hình đều được đánh giá
                      trên cùng một tập test 394 ảnh cố định, không đụng tới. Nên chúng em gọi nó là
                      <b> 'training-set perturbations' (xáo trộn tập huấn luyện)</b>: nó đo độ nhạy của
                      kết quả với việc chọn tập huấn luyện, chứ không tạo ra nhiều tập test khác nhau."
                    </Text>
                  </Callout>
                  <Callout tone="warning" title="Lưu ý về phiên bản tài liệu">
                    <Text size="small">
                      Bản nộp cuối <Code>FAIR2026_durian_leaf_submission_FINAL_2026-08-15.docx</Code> đã
                      dùng đúng cụm "five training-set perturbations on a fixed test set". Nhưng các bản
                      thảo CŨ hơn trong project — <Code>paper_durian_leaf_submission.md</Code> và
                      <Code>.tex</Code> (phần Conclusion) cùng Supplementary S1 — vẫn còn cụm
                      "5-fold cross-validation". <b>Em hãy đọc và trích theo bản DOCX FINAL</b>, vì đó là
                      bản đã nộp. Nếu hội đồng cầm bản cũ và chỉ ra chỗ này, cứ nói thẳng: đó là cách
                      diễn đạt ở bản thảo sớm, đã được chỉnh lại cho chính xác ở bản nộp.
                    </Text>
                  </Callout>
                </DocsSection>

                <DocsSection title="'Hypothesis-generating' nghĩa là gì">
                  <Text size="small">
                    Một kết quả <b>hypothesis-generating</b> (sinh giả thuyết) là kết quả <b>gợi ra một
                    giả thuyết đáng kiểm tra tiếp</b>, chứ chưa phải một kết luận đã được xác nhận. Ví dụ:
                    91 ảnh OOD thoát vào lớp Rhizoctonia gợi ra giả thuyết "mô hình nhạy cảm với khác biệt
                    về cách chụp hoặc ngoại quan" — nhưng thí nghiệm hiện tại <b>không tách được</b> yếu
                    tố nào chịu trách nhiệm, nên bài chỉ dừng ở mức gợi ý. Trái nghĩa với nó là
                    <b> hypothesis-testing</b> (kiểm định giả thuyết đã định trước). Dùng đúng hai từ này
                    sẽ khiến câu trả lời của em nghe rất chuyên nghiệp.
                  </Text>
                </DocsSection>

                <DocsSection title="Vì sao in-domain có macro-F1 và balanced accuracy đều ≈ 0.9889">
                  <Text size="small">
                    Đây KHÔNG phải lỗi hay trùng lặp. Hai đại lượng này gần bằng nhau một cách <b>tình
                    cờ</b> vì precision và recall của teacher ở 4 lớp đó gần như đối xứng nhau:
                  </Text>
                  <Table
                    density="compact"
                    headers={["Lớp", "Precision", "Recall", "F1", "Support"]}
                    rows={[
                      ["Leaf_Algal", "0.9855", "0.9714", "0.9784", "70"],
                      ["Leaf_Blight", "0.9706", "1.0000", "0.9851", "66"],
                      ["Leaf_Healthy", "1.0000", "1.0000", "1.0000", "74"],
                      ["Leaf_Phomopsis", "1.0000", "0.9841", "0.9920", "63"],
                    ]}
                  />
                  <Text size="small">
                    macro-F1 = trung bình F1 = <b>0.98887</b>; balanced accuracy = trung bình recall =
                    <b>0.98889</b>. Hai số chỉ khác nhau ở chữ số thập phân thứ năm, nên khi làm tròn 4
                    chữ số đều hiện là 0.9889. Ở các bảng khác hai đại lượng này TÁCH nhau rõ (ví dụ OOD:
                    macro-F1 0.3782 nhưng balanced accuracy 0.4199), nên đừng quen miệng nói chúng là một.
                  </Text>
                </DocsSection>
              </Stack>
            </CollapsibleSection>
          </Stack>
        </ReportSection>

        {/* ================= 6. TABLE 5 ================= */}
        <ReportSection
          title="6. Table 5 — Kiểm tra ngoài miền (zero-shot)"
          description="Con số gây sốc nhất bài, và cũng là con số dễ bị diễn giải quá đà nhất."
          meta="Section IV.D"
          divided
        >
          <Stack gap="container">
            <Table
              headers={["Mô hình", "Quy tắc quyết định", "In-domain macro-F1", "Out-of-domain macro-F1", "Δ", "OOD bal. acc."]}
              rows={[
                ["Teacher (end-to-end)", "restricted", "0.9889", "0.3782", "−0.6107", "0.4199"],
                ["Frozen head", "restricted", "0.9850", "0.3811", "−0.6039", "0.4298"],
                ["Teacher (end-to-end)", "unrestricted", "—", "accuracy 0.4158", "—", "—"],
              ]}
              rowTone={["danger", "danger", "muted"]}
            />

            <ChartContainer
              title="Sụp đổ hiệu năng khi chuyển sang bộ dữ liệu độc lập"
              description="Không huấn luyện lại bất kỳ thứ gì. Chỉ đánh giá trên 4 lớp chung."
              footer="Cả teacher lẫn head đóng băng đều rơi gần như nhau — vấn đề nằm ở biểu diễn, không phải ở đầu ra."
              caption="Nguồn: results/cross_dataset_eval.json"
              ariaLabel="Biểu đồ so sánh in-domain và out-of-domain"
            >
              <BarChart
                categories={OOD_CATEGORIES}
                series={[
                  { name: "Trong miền (4 lớp chung)", data: OOD_IN },
                  { name: "Ngoài miền (zero-shot)", data: OOD_OUT, tone: "danger" },
                ]}
                domain={[0, 1]}
                valuePrecision={4}
                height={240}
              />
            </ChartContainer>

            <Stack gap="inline">
              <H3>Hai không gian nhãn khớp nhau ở đâu</H3>
              <DiagramOOD tokens={tokens} />
              <Text size="small" tone="tertiary">
                Sơ đồ này trả lời luôn hai câu hỏi khó nhất của Table 5: vì sao in-domain lại cao bất
                thường (vì đã loại Colletotrichum và Rhizoctonia — khối đỏ bên trái), và vì sao phải có
                hai quy tắc argmax (vì mô hình nguồn có 6 đầu ra còn phép so chỉ dùng 4).
              </Text>
            </Stack>

            <Callout tone="danger" title="Cái bẫy số 4 — vì sao in-domain lại 0.9889, CAO HƠN 0.9255 ở Table 3?">
              <Text size="small">
                Đây là câu hỏi chắc chắn sẽ bị đặt ra, và nếu em ấp úng thì cả Table 5 sẽ bị nghi ngờ.
                Trả lời: <b>vì đây là một bài toán DỄ HƠN</b>. Con số 0.9889 chỉ tính trên <b>4 lớp
                chung</b> (Algal, Blight, Healthy, Phomopsis) và trên <b>273 ảnh</b> test của bộ nguồn
                thuộc 4 lớp đó. Hai lớp bị loại khỏi phép so này chính là <b>Rhizoctonia và
                Colletotrichum</b> — trong đó Colletotrichum là một trong hai lớp khó nhất. Bỏ hai lớp
                khó ra thì điểm tất nhiên nhảy vọt. Hai bên của phép so sánh dùng <b>cùng một không
                gian nhãn</b>, nên phép so vẫn hợp lệ; nhưng tuyệt đối không được đặt 0.9889 cạnh
                0.9255 như thể đó là cùng một bài toán.
              </Text>
            </Callout>

            <H3>Bộ dữ liệu đích và cách dựng phép so</H3>
            <Table
              headers={["Mục", "Chi tiết"]}
              rows={[
                ["Bộ đích", "Durian Leaf Disease Dataset (Kaggle, tác giả cthng123), thu thập ở vùng Đông Nam Bộ"],
                ["Số ảnh dùng được", "707 trên tổng 890 ảnh test của bộ đích"],
                ["4 lớp chung", "Algal, Blight, Healthy, Phomopsis"],
                ["Lớp bị loại", "ALLOCARIDARA_ATTACK — lớp SÂU HẠI chỉ có ở bộ đích. Bộ nguồn không có lớp tương đương"],
                ["Huấn luyện lại?", "KHÔNG. retrained = false. Đây là zero-shot hoàn toàn"],
              ]}
            />

            <Grid columns={2} gap="component" minColumnWidth={280}>
              <Callout tone="info" title="Quy tắc restricted">
                <Text size="small">
                  Lấy argmax <b>chỉ trên 4 logit chung</b>. Đây là cách xử lý chuẩn khi không gian nhãn
                  không khớp. Con số chính của bài (0.3782) dùng quy tắc này.
                </Text>
              </Callout>
              <Callout tone="warning" title="Quy tắc unrestricted">
                <Text size="small">
                  Lấy argmax trên <b>cả 6 logit nguồn</b>; ảnh nào bị gán vào lớp không tồn tại ở bộ
                  đích thì tính là sai. Mục đích: đo <b>mô hình thoát khỏi không gian nhãn hợp lệ bao
                  nhiêu lần</b>. Kết quả: <b>91 / 707</b> ảnh escape, trong đó Rhizoctonia 90 và
                  Colletotrichum 1 — tức dồn vào MỘT lớp nguồn. Accuracy unrestricted = 0.4158.
                </Text>
              </Callout>
            </Grid>

            <DocsSection title="Kết luận nào được phép rút ra, kết luận nào không">
              <Table
                headers={["ĐƯỢC phép nói", "KHÔNG được phép nói"]}
                rows={[
                  ["Cấu hình đã đánh giá CHƯA được xác nhận cho việc chuyển vườn nếu không có thích nghi.", "Mô hình này vô dụng khi chuyển vườn. (Chỉ mới thử MỘT bộ đích)"],
                  ["Việc chỉ đổi đầu phân loại không giải quyết được dịch chuyển quan sát thấy — head đóng băng cũng rơi tương tự.", "Đã xác định được nguyên nhân là do thiết bị chụp / độ phân giải / ánh sáng. (Protocol đo TỔNG HỢP các dịch chuyển, không tách được)"],
                  ["Đây là một kiểm tra zero-shot sơ bộ, hypothesis-generating.", "Đây là một benchmark đa site hoặc một đánh giá robustness tổng quát."],
                  ["Head re-fitting là thao tác rẻ nhất nên ĐÁNG ĐƯỢC ĐÁNH GIÁ ĐẦU TIÊN trong một workflow thích nghi site.", "Head re-fitting sẽ giải quyết được vấn đề chuyển vườn."],
                  ["Bài không nói gì về nhận diện sâu hại — lớp đó nằm ngoài phạm vi.", "Mô hình xử lý được cả côn trùng gây hại."],
                ]}
                rowTone={["success", "danger", "success", "danger", "success"]}
              />
              <Text size="small" tone="secondary">
                Figure 5 của bài bẻ phép so theo từng lớp và cho thấy khoảng cách <b>có mặt ở cả bốn
                lớp</b>. Chi tiết này quan trọng: nó loại trừ lời giải thích "chỉ một lớp bị gán nhãn
                sai hoặc bất thường kéo điểm xuống".
              </Text>
            </DocsSection>
          </Stack>
        </ReportSection>

        {/* ================= 7. TABLE 6 ================= */}
        <ReportSection
          title="7. Table 6 — Chi phí cập nhật, KHÔNG phải tốc độ suy luận"
          description="Đây là đóng góp trung tâm của bài và là chỗ dễ bị hiểu sai nhất. Dành thời gian cho mục này nhiều hơn các mục khác."
          meta="Section IV.E"
          divided
        >
          <Stack gap="container">
            <Table
              headers={["Cấu hình", "Phần được train", "Test macro-F1", "Retained", "Train (s)", "Speed-up", "Head-only (ms)", "End-to-end (ms)", "Size (MB)"]}
              rows={[
                ["MobileNetV2 (teacher)", "toàn bộ backbone + head", "0.9255", "100.0%", "57.7", "1.0×", "—", "8.291", "8.748"],
                ["logistic regression (frozen)", "chỉ head", "0.9235", "99.78%", "1.28", "45.1×", "0.103", "8.394", "0.089"],
                ["linear SVC (frozen)", "chỉ head", "0.9179", "99.18%", "0.44", "131.1×", "0.128", "8.419", "0.089"],
              ]}
              rowTone={["default", "success", "default"]}
            />
            <Text size="small" tone="tertiary">
              Thời gian của frozen head <b>loại trừ</b> chi phí một lần của việc fine-tune backbone và
              trích xuất embedding. Cột head-only <b>loại trừ</b> backbone; cột end-to-end <b>gồm</b> backbone.
            </Text>

            <ChartContainer
              title="Chi phí của một lần cập nhật mô hình"
              description="Thời gian wall-clock để fine-tune cả mạng so với thời gian fit lại head trên embedding đã cache."
              footer="Chênh lệch khoảng 45 lần với LR và 131 lần với linear SVC — đây là lợi ích thật sự của bài."
              caption="Đo trên máy thí nghiệm: NVIDIA GeForce RTX 3090 (CUDA) / AMD64 Family 26 Model 68. Nguồn: results/deployment_tradeoff.csv"
              ariaLabel="Biểu đồ thời gian huấn luyện"
            >
              <BarChart
                categories={COST_CATEGORIES}
                series={[{ name: "Thời gian train (giây)", data: COST_SECONDS }]}
                horizontal
                valueSuffix=" s"
                valuePrecision={2}
                height={180}
                showLegend={false}
              />
            </ChartContainer>

            <Stack gap="inline">
              <H3>Hai con đường chi phí — sơ đồ quan trọng nhất của cả bài</H3>
              <DiagramCost tokens={tokens} />
              <Text size="small" tone="tertiary">
                Đọc hai làn này cạnh nhau là hiểu ngay đóng góp của bài: <b>cùng một mô hình</b>, nhưng
                tiết kiệm được ở đường A và <b>không</b> tiết kiệm ở đường B. Nếu em chỉ nhớ được một
                hình ảnh từ toàn bộ tài liệu này, hãy nhớ hình này.
              </Text>
            </Stack>

            <Callout tone="danger" title="Cái bẫy số 5 — câu nói sẽ khiến em mất điểm ngay lập tức">
              <Stack gap="inline">
                <Text size="small">
                  <b>Sai:</b> "Vì head chỉ 0.089 MB nên mô hình chạy nhanh hơn trên điện thoại."
                </Text>
                <Text size="small">
                  <b>Đúng:</b> "Latency end-to-end <b>không</b> giảm. Frozen LR mất 8.394 ms còn teacher
                  mất 8.291 ms — gần như y hệt, thậm chí nhỉnh hơn một chút. Lý do là head nhận đầu vào
                  là embedding, nên muốn có embedding thì <b>vẫn phải chạy backbone</b>. Lợi ích đo được
                  nằm ở <b>chi phí cập nhật</b>: khi nhãn mới xuất hiện hoặc khi chuyển vườn, ta chỉ cần
                  fit lại head trên embedding đã cache — 1.28 giây và 0.089 MB, thay vì 57.7 giây và 8.748 MB."
                </Text>
                <Text size="small" tone="secondary">
                  Người viết bản thảo đã đánh dấu đây là "chỗ dễ bị hiểu sai nhất cả bài" và cố tình in
                  đậm câu khẳng định trong Discussion. Em nên chủ động nói rõ điểm này TRƯỚC khi bị hỏi —
                  nó biến một điểm yếu tiềm tàng thành bằng chứng về sự trung thực khoa học.
                </Text>
              </Stack>
            </Callout>

            <Callout tone="danger" title="Cái bẫy số 6 — '99.78%' KHÔNG phải là độ chính xác">
              <Stack gap="inline">
                <Text size="small">
                  Con số <b>99.78%</b> rất dễ bị nói nhầm thành "mô hình chính xác 99.78%". Sai hoàn toàn.
                  Nó là <b>tỉ lệ hiệu năng được giữ lại</b>: 0.9235 chia cho 0.9255 = 99.78%. Độ chính xác
                  thực vẫn là <b>0.9235 macro-F1</b> (tương đương 0.9264 accuracy trên test).
                </Text>
                <Text size="small">
                  Nói đúng: "Đầu logistic regression trên embedding đóng băng <b>giữ lại được 99.78%</b>
                  macro-F1 của teacher" — tức là chỉ mất 0.22% so với mốc 0.9255. Tương tự với linear SVC:
                  0.9179 chia 0.9255 = <b>99.18%</b> được giữ lại.
                </Text>
                <Text size="small" tone="secondary">
                  Mẹo nhớ: cứ thấy chữ <b>retained</b> (giữ lại) trong Table 6 là biết đó là tỉ lệ SO VỚI
                  MỐC, không phải điểm tuyệt đối. Đây là kiểu con số rất dễ bị thổi phồng khi thuyết trình,
                  nên em chủ động nói rõ đơn vị và mốc so sánh thì sẽ tạo được ấn tượng tốt.
                </Text>
              </Stack>
            </Callout>

            <H3>Hồ sơ backbone (Section IV.E)</H3>
            <Grid columns={4} gap="component" minColumnWidth={150}>
              <Stat label="Tham số" value="2.232M" description="checkpoint 8.75 MB" />
              <Stat label="Latency CPU, batch 1" value="8.291 ms" description="≈ 120.6 ảnh/giây" />
              <Stat label="Throughput GPU batch 32" value="3292.7" unit="ảnh/s" description="chỉ để tham chiếu" />
              <Stat label="Bộ nhớ đỉnh" value="1571.7 MB" description="peak resident" />
            </Grid>
            <Callout tone="warning" title="Nói đúng về latency">
              <Text size="small">
                Latency được đo trên <b>CPU desktop như một proxy</b> cho phần cứng thực địa. Bài
                <b> không</b> có số đo trên Jetson hay Raspberry Pi, nên các con số latency tuyệt đối
                chỉ nên đọc như <b>so sánh tương đối</b> giữa các cấu hình trên cùng một máy, không phải
                là dự báo hiệu năng trên thiết bị nông hộ. Máy RTX 3090 là máy thí nghiệm, <b>không phải
                yêu cầu</b> để tái lập độ chính xác — tái lập độ chính xác thì chạy CPU cũng được, chỉ chậm hơn.
              </Text>
            </Callout>

            <DocsSection title="Workflow bảo trì mà bài đề xuất (và giới hạn của nó)">
              <Text size="small">
                Bài gợi ý một workflow <b>có thể kiểm chứng được</b> cho dịch vụ nông nghiệp số:
                (1) giữ lại một backbone đã được xác nhận; (2) thu thập một lượng ảnh có nhãn tại địa
                phương; (3) <b>đánh giá việc fit lại head trước</b>, rồi mới cân nhắc fine-tune toàn mạng.
                Logic rất hợp lý về mặt kinh tế: thao tác rẻ nhất nên được thử trước.
              </Text>
              <Text size="small" tone="secondary">
                Nhưng phải nói rõ giới hạn: các phép đo ở đây là <b>fit lại head trên embedding đã cache
                trên máy profiling</b>. Bài <b>không</b> chứng minh một workflow cập nhật chạy trên thiết
                bị (on-device), và chưa định lượng <b>cần bao nhiêu nhãn</b> thì head re-fitting mới đủ
                tốt. Cả hai điểm này nằm trong Future Work.
              </Text>
            </DocsSection>
          </Stack>
        </ReportSection>
        {/* ================= 8. PHÂN TÍCH LỖI ================= */}
        <ReportSection
          title="8. Phân tích lỗi và ba can thiệp thất bại"
          description="Một kết quả âm được báo cáo tử tế. Đây thường là phần gây ấn tượng nhất với hội đồng, nếu em kể đúng giọng."
          meta="Section IV.C + Table S1, S2"
          divided
        >
          <Stack gap="container">
            <Grid columns={3} gap="component" minColumnWidth={180}>
              <Stat label="Ảnh test bị phân loại sai" value="28 / 394" description="ở seed được chọn (42)" />
              <Stat
                label="Lỗi dính Blight hoặc Colletotrichum"
                value="26"
                valueSuffix=" (92.9%)"
                tone="danger"
                description="lỗi KHÔNG phân tán, mà dồn cục"
              />
              <Stat label="F1 của hai lớp khó" value="0.8333 / 0.8421" description="Blight / Colletotrichum ở seed 42" tone="warning" />
            </Grid>

            <ChartContainer
              title="F1 từng lớp qua 5 lần xáo trộn tập huấn luyện (Table S1)"
              description="Tập test cố định 394 ảnh. Sắp xếp từ lớp tốt nhất xuống lớp yếu nhất."
              footer="Blight và Colletotrichum tụt hẳn xuống dưới 0.81 trong khi bốn lớp còn lại đều trên 0.91 — lỗi KHÔNG phân tán đều."
              caption="Nguồn: results/teacher_cv_summary.json, trường test_per_class_f1"
              ariaLabel="Biểu đồ F1 từng lớp"
            >
              <BarChart
                categories={PERCLASS_CATEGORIES}
                series={[{ name: "F1 (mean qua 5 fold)", data: PERCLASS_VALUES }]}
                horizontal
                domain={[0.7, 1.0]}
                includeZero={false}
                valuePrecision={4}
                height={230}
                showLegend={false}
              />
            </ChartContainer>

            <Table
              density="compact"
              headers={["Lớp", "F1 (mean ± SD)", "Min", "Max", "Nhận xét"]}
              rows={[
                ["Healthy", "0.9753 ± 0.0189", "0.9427", "0.9933", "Gần như tách hoàn hảo"],
                ["Algal", "0.9701 ± 0.0080", "0.9577", "0.9784", "Rất tốt và rất ổn định (SD nhỏ nhất)"],
                ["Phomopsis", "0.9490 ± 0.0129", "0.9268", "0.9618", "Tốt"],
                ["Rhizoctonia", "0.9122 ± 0.0147", "0.8926", "0.9268", "Khá, nhưng hay bị Blight kéo nhầm vào"],
                ["Colletotrichum", "0.8021 ± 0.0190", "0.7679", "0.8205", "LỚP YẾU — tổn thương hoại tử"],
                ["Blight", "0.7851 ± 0.0359", "0.7377", "0.8308", "LỚP YẾU NHẤT và KÉM ỔN ĐỊNH NHẤT — SD rộng nhất, gấp khoảng 4.5 lần Algal"],
              ]}
              rowTone={["success", "success", "default", "default", "warning", "danger"]}
            />
            <Text size="small" tone="secondary">
              Table S1 chính là thứ <b>nhận diện</b> Blight và Colletotrichum là hai lớp vừa có F1 trung
              bình thấp nhất vừa có khoảng dao động fold-to-fold rộng nhất. Chú ý chi tiết đáng giá khi
              thuyết trình: SD của Blight là 0.0359, <b>gấp khoảng 4.5 lần</b> Algal (0.0080, lớp ổn định
              nhất) và gần gấp đôi Colletotrichum (0.0190) — nghĩa là Blight không chỉ yếu mà còn
              <b> phụ thuộc mạnh vào tập huấn luyện</b>, một dấu hiệu điển hình của ranh giới lớp mơ hồ
              chứ không phải của việc thiếu dữ liệu.
            </Text>

            <DocsSection title="Ba cặp nhầm lớn nhất">
              <Table
                headers={["Cặp nhầm", "Số ảnh", "Ý nghĩa"]}
                rows={[
                  ["Colletotrichum bị đoán thành Blight", "8", "Hướng thứ nhất của nhầm lẫn hai chiều"],
                  ["Blight bị đoán thành Colletotrichum", "6", "Hướng ngược lại — nhầm theo CẢ HAI chiều, tức mơ hồ thật sự"],
                  ["Blight bị đoán thành Rhizoctonia", "5", "Cả ba đều là bệnh lý tổn thương hoại tử"],
                ]}
                rowTone={["warning", "warning", "default"]}
              />
              <DiagramConfusion tokens={tokens} />
              <Text size="small" tone="secondary">
                Cách diễn đạt của bài: "failure mode chủ đạo là nhầm lẫn hai chiều bên trong một nhóm
                nhỏ các bệnh lý tổn thương hoại tử". Nói như vậy chính xác và mạnh hơn nhiều so với
                "mô hình hay nhầm Blight với Colletotrichum".
              </Text>
              <Text size="small" tone="secondary">
                Đầy đủ 10 cặp nhầm trên 28 ảnh: Colle→Blight 8, Blight→Colle 6, Blight→Rhizo 5,
                Algal→Blight 2, Colle→Phomopsis 2, và năm cặp đơn lẻ (Colle→Algal, Colle→Healthy,
                Phomopsis→Rhizo, Phomopsis→Algal, Rhizo→Blight). Ba cặp đầu đã chiếm 19 trên 28 lỗi.
              </Text>
            </DocsSection>

            <DocsSection title="Bằng chứng Grad-CAM và suy luận từ nó">
              <Text size="small">
                Grad-CAM trên các ảnh bị phân loại sai (Figure S3) cho thấy activation <b>tập trung vào
                tổn thương và viền của nó</b>, chứ không phải vào nền hay cấu trúc lá không liên quan.
              </Text>
              <Text size="small">
                Suy luận: nếu mô hình đã nhìn đúng chỗ mà vẫn đoán sai, thì đây <b>không phải lỗi định
                vị</b> (localisation failure) — nên "attention tốt hơn" hay "augmentation mạnh hơn" không
                phải thứ sẽ sửa được. Đây là <b>mơ hồ thị giác thật sự</b> giữa hai bệnh tạo ra tổn
                thương hoại tử trông giống nhau.
              </Text>
              <Text size="small" tone="secondary">
                Nói đúng mức: bài viết rõ Grad-CAM là <b>bằng chứng định tính</b> và "chúng tôi không
                đọc nhiều hơn thế từ nó". Em cũng phải giữ đúng mức đó khi thuyết trình — đừng biến
                Grad-CAM thành bằng chứng nhân quả.
              </Text>
              <Text size="small" tone="secondary">
                Cách chọn ảnh để minh hoạ cũng là một điểm nên biết: không chọn tay. Với ảnh đúng, lấy
                ảnh có xác suất dự đoán cao nhất của từng lớp. Với ảnh sai, xếp các cặp nhầm theo tần
                suất rồi lấy ảnh round-robin giữa các cặp, để cả hai chiều của nhầm lẫn chủ đạo đều có mặt.
              </Text>
            </DocsSection>

            <Divider />
            <H3>Ba can thiệp đã thử — và kết quả</H3>
            <Table
              headers={["Cấu hình", "Hàm mất mát", "Test macro-F1", "F1 Blight", "F1 Colletotrichum", "Nhận xét"]}
              rows={[
                ["Baseline", "cross-entropy", "0.9088 ± 0.0119", "0.8004 ± 0.0240", "0.8152 ± 0.0191", "Tham chiếu"],
                ["weighted", "CE trọng số nghịch đảo tần suất", "0.8858 ± 0.0224", "0.7530 ± 0.0385", "0.8116 ± 0.0174", "GIẢM cả hai lớp khó"],
                ["focal", "focal loss (γ = 2.0) cùng trọng số", "0.9025 ± 0.0188", "0.7651 ± 0.0476", "0.8261 ± 0.0190", "Tăng Colletotrichum, GIẢM Blight"],
                ["augmented", "CE + augment riêng 2 lớp khó", "0.9050 ± 0.0085", "0.8104 ± 0.0105", "0.8056 ± 0.0359", "Tăng Blight, GIẢM Colletotrichum"],
              ]}
              rowTone={["accent", "danger", "warning", "warning"]}
            />
            <Text size="small" tone="tertiary">
              Mọi ô là mean ± SD trên cùng 3 seed 42/43/44. Augmentation ngoại tuyến tạo 588 ảnh
              (factor 1) với random_crop 0.80–0.95, rotate ±15°, hflip p=0.5, brightness/contrast/color
              jitter, gaussian_blur p=0.20, unsharp p=0.15.
            </Text>

            <ChartContainer
              title="Không can thiệp nào cải thiện được cả hai lớp khó cùng lúc"
              description="Mean test macro-F1 và F1 của từng lớp khó, trên cùng 3 seed."
              footer="Can thiệp tốt nhất chỉ thay đổi macro-F1 −0.0038, nằm gọn trong một độ lệch chuẩn của baseline (0.0119)."
              caption="Nguồn: results/teacher_weighted_summary.json, teacher_focal_summary.json, teacher_augmented_summary.json"
              ariaLabel="Biểu đồ so sánh ba can thiệp"
            >
              <BarChart
                categories={INTERVENTION_CATEGORIES}
                series={[
                  { name: "Test macro-F1", data: INTERVENTION_MACRO },
                  { name: "F1 Blight", data: INTERVENTION_BLIGHT, tone: "warning" },
                  { name: "F1 Colletotrichum", data: INTERVENTION_COLLE, tone: "danger" },
                ]}
                domain={[0.7, 0.95]}
                includeZero={false}
                valuePrecision={4}
                height={260}
              />
            </ChartContainer>

            <Callout tone="info" title="Lập luận then chốt: vì sao đây KHÔNG phải bài toán mất cân bằng lớp">
              <Stack gap="inline">
                <Text size="small">
                  Đây là chỗ hay nhất của Section 4.3 và em nên dành thời gian kể nó cho mạch lạc.
                  Phản xạ thông thường khi thấy hai lớp yếu là "chắc do ít dữ liệu, cứ weighting là xong".
                  Bài này <b>bác bỏ</b> phản xạ đó bằng số liệu:
                </Text>
                <Text size="small">
                  (1) Trọng số inverse-frequency chỉ trải trong khoảng <b>0.89 đến 1.08</b> — gần như
                  bằng 1, nghĩa là chẳng có lớp nào thực sự thiểu số.
                </Text>
                <Text size="small">
                  (2) Lớp lớn nhất chỉ gấp <b>1.22 lần</b> lớp nhỏ nhất (484 so với 398).
                </Text>
                <Text size="small">
                  (3) Hai lớp yếu là lớp <b>cỡ trung bình</b> (Blight 440, Colletotrichum 400), không
                  phải lớp nhỏ nhất.
                </Text>
                <Text size="small">
                  (4) Và thực nghiệm: cả ba can thiệp nhắm vào cân bằng/mẫu đều không cải thiện macro-F1.
                </Text>
                <Text size="small" weight="semibold">
                  Kết luận của bài: lỗi còn lại phản ánh <b>giới hạn của supervision hiện có</b> — cần
                  nhãn cấp tổn thương (lesion-level) hoặc thêm dữ liệu thực địa cho hai bệnh này — chứ
                  không phải do chọn hàm mất mát hay chiến lược lấy mẫu.
                </Text>
                <Text size="small" tone="secondary">
                  Nói đúng mức một lần nữa: bài viết "nhất quán với một giới hạn supervision", không
                  viết "đã chứng minh". Và bài cũng ghi rõ đây không phải bằng chứng rằng các mô hình
                  hay chiến lược huấn luyện khác không thể giúp.
                </Text>
              </Stack>
            </Callout>

            <Callout tone="success" title="Hệ quả thiết kế cho dịch vụ nông nghiệp số">
              <Text size="small">
                Vì lỗi dồn cục và không sửa được bằng kỹ thuật huấn luyện, bài rút ra một hệ quả thiết
                kế rất cụ thể: <b>không nên phát ra một nhãn đơn độc, vô điều kiện</b>. Thay vào đó,
                hiển thị <b>top-2 dự đoán kèm độ tin cậy</b>, rồi <b>định tuyến các ca mơ hồ cho chuyên
                gia nông nghiệp</b>. Đây chính là ý "human-in-the-loop" và là thứ nối kết quả kỹ thuật
                với bối cảnh chuyển đổi số nông nghiệp mà Section I đã đặt ra.
              </Text>
            </Callout>
          </Stack>
        </ReportSection>

        {/* ================= 9. INTERPRETABILITY ================= */}
        <ReportSection
          title="9. Khả năng giải thích — SHAP và Grad-CAM"
          description="Vì sao bài vẫn giữ một nhánh đặc trưng không đóng góp gì cho độ chính xác."
          meta="Section V + Supplementary S3"
          divided
        >
          <Stack gap="container">
            <Grid columns={2} gap="component" minColumnWidth={240}>
              <Stat
                label="Tỉ trọng importance của nhánh thủ công"
                value="0.8%"
                tone="danger"
                description="trong tổng mean |SHAP| của tập đặc trưng ghép"
              />
              <Stat
                label="Tỉ trọng của nhánh embedding"
                value="99.2%"
                tone="success"
                description="XGBoost trên embedding + thủ công, 300 mẫu test, estimator riêng cho tree"
              />
            </Grid>
            <Text size="small" tone="secondary">
              Bài gọi đây là "bằng chứng đơn lẻ rõ ràng nhất" cho thấy nhánh thủ công không điều khiển
              dự đoán. Con số 0.8% này nhất quán với Table 3 (ghép thêm thì không tăng) và Table S4
              (Δ ≈ 0 ở mọi head) — ba nguồn bằng chứng độc lập cùng chỉ một hướng.
            </Text>

            <Table
              headers={["Đặc trưng thủ công", "Mean |SHAP|", "Dịch ra ngôn ngữ cán bộ nông nghiệp"]}
              rows={[
                ["shape_leaf_mean_v", "0.00179", "Độ sáng trung bình của lá"],
                ["shape_lesion_count", "0.00133", "Số đốm tổn thương sau phân ngưỡng Otsu"],
                ["hist_S_05", "0.00119", "Bin thứ 6 của histogram độ bão hoà (saturation)"],
                ["hist_H_05", "0.00114", "Bin thứ 6 của histogram tông màu (hue)"],
                ["hist_H_08", "0.00109", "Bin thứ 9 của histogram hue"],
                ["hist_S_03", "0.00095", "Bin thứ 4 của histogram saturation"],
                ["shape_solidity", "0.00089", "Độ đặc khối của lá (diện tích lá / diện tích bao lồi)"],
                ["color_mean_laba", "0.00072", "Kênh a* trung bình trong CIELAB (trục xanh–đỏ)"],
                ["glcm_correlation_d1", "0.00068", "Tương quan kết cấu GLCM ở offset thứ nhất"],
                ["shape_lesion_area_ratio", "0.00066", "Tỉ lệ diện tích tổn thương trên diện tích lá"],
              ]}
            />
            <Text size="small" tone="tertiary">
              Tên đặc trưng là <b>tên trường trong code</b>, không phải tên khoa học. Phải biết điều này
              để đọc Figure 7(a) và Table S3 mà không bị bối rối.
            </Text>

            <Callout tone="info" title="Luận điểm chính về interpretability — học thuộc ý này">
              <Text size="small">
                "Khả năng giải thích vẫn sống sót ngay cả ở nơi giá trị dự đoán thì không." Những đặc
                trưng xếp hạng cao nhất — độ sáng lá, số tổn thương, độ bão hoà, tông màu, solidity —
                đều là <b>đại lượng mà một cán bộ nông nghiệp có thể kiểm chứng bằng mắt</b>. Một chỉ
                số chiều embedding thứ 743 thì không. Vậy vai trò đúng của nhánh thủ công trong pipeline
                này là <b>kênh giải thích trình bày kèm theo dự đoán</b>, KHÔNG phải thành phần hiệu năng.
              </Text>
            </Callout>

            <DocsSection title="Ba mức giải thích trong bài — và chỗ dừng">
              <Table
                headers={["Công cụ", "Cho biết điều gì", "KHÔNG cho biết điều gì"]}
                rows={[
                  ["SHAP trên nhánh thủ công", "Từ vựng mà con người đọc được: độ sáng, số đốm, màu, độ đặc khối", "Không cho mức độ nặng nhẹ của bệnh"],
                  ["Grad-CAM", "Bằng chứng định tính rằng mô hình nhìn vào vùng tổn thương", "Không phải giải thích nhân quả, không phải bằng chứng định lượng"],
                  ["Top-2 + độ tin cậy", "Cơ sở để định tuyến ca mơ hồ sang chuyên gia", "Không phải khuyến nghị xử lý / phun thuốc"],
                ]}
              />
              <Text size="small" tone="secondary">
                Câu chốt của Discussion: "Pipeline do đó có thể hỗ trợ <b>sàng lọc số có truy vết và
                chuyển tuyến</b> (traceable digital screening and referral), <b>không phải</b> quản lý
                bệnh tự động." Không có thành phần nào trong ba thứ trên tạo ra <b>ước lượng mức độ nặng</b>
                hay <b>khuyến nghị điều trị</b>.
              </Text>
            </DocsSection>
          </Stack>
        </ReportSection>

        {/* ================= 10. HẠN CHẾ ================= */}
        <ReportSection
          title="10. Hạn chế và phạm vi của khẳng định"
          description="Section V. Nắm chắc phần này thì không câu hỏi phản biện nào làm em bất ngờ được."
          divided
        >
          <Stack gap="container">
            <Table
              headers={["#", "Hạn chế", "Hội đồng có thể hỏi gì", "Cách trả lời"]}
              rows={[
                ["1", "Cố tình KHÔNG claim state-of-the-art. Trọng tâm là protocol và chi phí.", "Sao không thử kiến trúc mạnh hơn để điểm cao hơn?", "Một điểm cao hơn từ architecture search hay augmentation nặng sẽ KHÔNG thay đổi bất kỳ kết luận nào của bài, vì các kết luận đều về độ ổn định, về sự vắng mặt của khác biệt có ý nghĩa, và về chi phí cập nhật."],
                ["2", "Dữ liệu train từ MỘT release, 2 tỉnh, 2595 ảnh. Kiểm tra OOD chỉ 1 bộ đích, 707 ảnh, 4 lớp chung.", "Một bộ đích thì kết luận được gì?", "Đủ để khẳng định chuyển giao THẤT BẠI ở đây, nhưng không đủ để mô tả chuyển giao hoạt động thế nào nói chung. Bài nói rõ cần một nghiên cứu đa site."],
                ["3", "Hai bộ khác nhau ở NHIỀU thứ cùng lúc: thiết bị chụp, cách lấy khung hình, tiền xử lý, và ảnh đích ở độ phân giải nhỏ cố định.", "Vậy nguyên nhân sụp đổ là gì?", "Protocol đo TỔNG HỢP các dịch chuyển đó và KHÔNG quy được cho yếu tố đơn lẻ nào. Bài ghi rõ đây là quan sát hypothesis-generating, không phải chẩn đoán nhân quả."],
                ["4", "Sâu hại ngoài phạm vi: lớp ALLOCARIDARA_ATTACK của bộ đích bị loại, bộ nguồn không có lớp tương đương.", "Mô hình có nhận diện được côn trùng không?", "Không. Bài không nói gì về nhận diện sâu hại, và đây là một giới hạn phạm vi có chủ đích."],
                ["5", "Latency đo trên CPU desktop như một proxy. Không có số trên Jetson hay Raspberry Pi.", "8 ms trên desktop thì trên điện thoại là bao nhiêu?", "Chưa đo. Nên các con số latency tuyệt đối chỉ đọc như SO SÁNH TƯƠNG ĐỐI giữa các cấu hình trên cùng một máy. Đo trên thiết bị edge thật nằm trong future work."],
                ["6", "Ảnh cấp tán cây (UAV) ngoài phạm vi.", "Bay UAV chụp cả tán thì dùng mô hình này được không?", "Không kỳ vọng mô hình cấp lá chuyển được sang ảnh mảng tán cây nếu không train lại. Bài nói rõ điều này."],
                ["7", "Không có nhãn cấp tổn thương hay nhãn mức độ nặng.", "Sao không huấn luyện thêm để sửa hai lớp khó?", "Thiếu nhãn lesion-level VỪA giới hạn các biện pháp có thể thử VỪA giới hạn mức độ actionable của đầu ra với cán bộ nông nghiệp. Đây là nút thắt dữ liệu, không phải nút thắt thuật toán."],
                ["8", "Lập luận về chi phí cập nhật chỉ được chứng minh bằng thời gian fit lại trên embedding đã cache.", "Vậy đã có hệ thống chạy thật ngoài vườn chưa?", "Chưa. Một nghiên cứu triển khai thực địa đầy đủ, gồm cả cache embedding và lưu trữ trên thiết bị, để lại cho future work."],
              ]}
            />

            <Callout tone="warning" title="Phạm vi của khẳng định — câu chốt phải thuộc">
              <Text size="small">
                "Đây là một <b>nghiên cứu tình huống được kiểm định cẩn thận</b> trên ảnh lá sầu riêng
                Việt Nam, <b>không phải một quy luật chung</b> về đặc trưng thủ công, về backbone đóng
                băng, hay về triển khai nông nghiệp thông minh. Trên bộ dữ liệu nguồn này, với backbone
                này và tập descriptor này, đặc trưng thủ công không cho lợi ích dự đoán quan sát được,
                và head chỉ dùng embedding đóng băng có chi phí cập nhật tăng dần thấp hơn. Kiểm tra
                ngoài miền duy nhất cho thấy <b>cả hai kết quả đó đều không xác nhận việc chuyển sang
                vườn khác nếu không thích nghi</b>. Hành vi trên ảnh thô hơn, nhiều lớp hơn, backbone
                mới hơn và cây trồng khác vẫn còn bỏ ngỏ."
              </Text>
            </Callout>

            <DocsSection title="Future Work — ba việc bài nêu tên cụ thể">
              <Table
                headers={["Việc", "Vì sao quan trọng"]}
                rows={[
                  ["Kiểm tra thích nghi site có chủ đích (prospective) với dữ liệu có nhãn tại đích", "Biến quan sát 0.3782 từ 'chuyển giao thất bại' thành 'cần bao nhiêu thì chuyển giao được'"],
                  ["Định lượng CẦN BAO NHIÊU NHÃN cho head re-fitting so với full fine-tuning", "Đây chính là con số mà một trạm khuyến nông cần để ra quyết định. Table 6 mới chỉ nói head re-fitting rẻ hơn, chưa nói nó cần bao nhiêu dữ liệu"],
                  ["Thêm nhãn cấp tổn thương cho cặp lớp mơ hồ", "Mở khoá cả hai vấn đề: biện pháp kỹ thuật cho Blight/Colletotrichum, và mức độ actionable của đầu ra"],
                ]}
              />
            </DocsSection>
          </Stack>
        </ReportSection>

        {/* ================= 11. CÂU HỎI TỰ KIỂM TRA ================= */}
        <ReportSection
          title="11. Bộ câu hỏi tự kiểm tra"
          description="24 câu chia 4 mức. Làm lần lượt. Trả lời ra giấy hoặc nói thành tiếng TRƯỚC khi mở đáp án."
          meta="Mức 1 nhớ · Mức 2 hiểu · Mức 3 vận dụng · Mức 4 phản biện"
          divided
        >
          <Stack gap="container">
            <Row gap="inline" wrap>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  for (let i = 1; i <= 24; i++) next["q" + i] = true;
                  setRevealed((prev) => ({ ...prev, ...next }));
                }}
              >
                Hiện tất cả đáp án
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  for (let i = 1; i <= 24; i++) next["q" + i] = false;
                  setRevealed((prev) => ({ ...prev, ...next }));
                }}
              >
                Ẩn tất cả đáp án
              </Button>
              <Text size="small" tone="tertiary">
                Gợi ý: làm hết mức 1 và 2 trong một lần ngồi; mức 3 và 4 nên làm sau khi đã đọc xong
                Section V của bài báo.
              </Text>
            </Row>

            <H3>Mức 1 — Nhớ</H3>
            <Stack gap="inline">
              <QA code="Q1" level="Nhớ" tone="neutral" revealed={isOpen("q1")} onToggle={() => toggle("q1")}
                question="Bài dùng bộ dữ liệu nào? Bao nhiêu ảnh, bao nhiêu lớp, split ra sao, giấy phép gì?"
                answer={<Text size="small">Mendeley Data "A Durian Leaf Image Dataset of Common Diseases in Vietnam for Agricultural Diagnosis", bản ghi pxzvksbwnj, DOI 10.17632/pxzvksbwnj.4, giấy phép CC BY 4.0. 2595 ảnh, 6 lớp, split do tác giả dữ liệu định nghĩa: train 1814 / val 387 / test 394 — GIỮ NGUYÊN. Thí nghiệm dùng version 3 (SHA-256 5e271cfd...8dce) vì version 4 có listing rỗng ở API root. Bài mô tả dữ liệu trích riêng: Nguyen et al., Data in Brief 61:111845, 2025.</Text>} />
              <QA code="Q2" level="Nhớ" tone="neutral" revealed={isOpen("q2")} onToggle={() => toggle("q2")}
                question="Teacher là kiến trúc gì? Input bao nhiêu? Optimizer, learning rate, batch size, số epoch, early stopping theo tiêu chí nào?"
                answer={<Text size="small">MobileNetV2 khởi tạo từ ImageNet, thay head bằng lớp tuyến tính 6 lớp, input 224×224. AdamW, lr 0.001, weight decay 0.0001, cosine annealing, batch 32, tối đa 25 epoch, early stopping theo VALIDATION macro-F1 với patience 5, mixed precision trên CUDA. Seed 42/43/44; seed dùng cho trích xuất đặc trưng chọn theo validation.</Text>} />
              <QA code="Q3" level="Nhớ" tone="neutral" revealed={isOpen("q3")} onToggle={() => toggle("q3")}
                question="Embedding sâu bao nhiêu chiều, lấy ở đâu? Nhánh đặc trưng thủ công bao nhiêu chiều, gồm những họ nào?"
                answer={<Text size="small">Embedding 1280 chiều, là activation của lớp penultimate. Nhánh thủ công 71 chiều gồm 4 họ: Colour 12 chiều, Histogram 24 chiều (hue 16 bin + saturation 8 bin), Texture 22 chiều (GLCM ở 2 offset + LBP uniform), Shape 13 chiều (từ phân ngưỡng Otsu trên kênh a*). Ghép lại thành 1351 chiều.</Text>} />
              <QA code="Q4" level="Nhớ" tone="neutral" revealed={isOpen("q4")} onToggle={() => toggle("q4")}
                question="Nêu 5 con số headline của bài, mỗi số kèm một vế giải thích."
                answer={<Text size="small">(1) 0.9088 ± 0.0119 — teacher MobileNetV2, macro-F1 test, mean ± SD trên seed 42/43/44. (2) 0.8990 ± 0.0103 — cùng tập test cố định sau 5 lần xáo trộn tập train. (3) McNemar p = 0.7266 và bootstrap CI [−0.0094, +0.0198] — teacher so hybrid concat trên 394 ảnh chung, không phát hiện khác biệt. (4) 99.78% macro-F1 được giữ, fit lại nhanh 45.1 lần, head 0.089 MB — nhưng latency end-to-end KHÔNG đổi. (5) 0.9889 xuống 0.3782 — zero-shot trên 4 lớp chung của một bộ Việt Nam độc lập. Thêm một con số nên nhớ: 92.9% lỗi còn lại dính Blight và Colletotrichum.</Text>} />
              <QA code="Q5" level="Nhớ" tone="neutral" revealed={isOpen("q5")} onToggle={() => toggle("q5")}
                question="Máy thí nghiệm là gì? Backbone bao nhiêu tham số, checkpoint bao nhiêu MB?"
                answer={<Text size="small">NVIDIA GeForce RTX 3090 (CUDA) trên CPU AMD64 Family 26 Model 68 Stepping 0 (AuthenticAMD). Backbone 2.232M tham số, checkpoint 8.75 MB. Latency CPU một ảnh 8.291 ms (120.6 ảnh/s); GPU batch 32 đạt 3292.7 ảnh/s; bộ nhớ đỉnh 1571.7 MB. GPU KHÔNG bắt buộc để tái lập độ chính xác — chỉ cần cho các con số thời gian trong Table 6.</Text>} />
              <QA code="Q6" level="Nhớ" tone="neutral" revealed={isOpen("q6")} onToggle={() => toggle("q6")}
                question="Bộ dữ liệu OOD tên gì, ở đâu, bao nhiêu ảnh test, bao nhiêu lớp dùng được, lớp nào bị loại?"
                answer={<Text size="small">"Durian Leaf Disease Dataset" trên Kaggle của tác giả cthng123, thu thập ở vùng Đông Nam Bộ. Có 890 ảnh test, dùng được 707 ảnh sau khi giới hạn ở 4 lớp chung (Algal, Blight, Healthy, Phomopsis). Lớp ALLOCARIDARA_ATTACK (sâu hại) bị loại vì bộ nguồn không có lớp tương đương. In-domain reference là 273 ảnh test của bộ nguồn thuộc 4 lớp chung đó.</Text>} />
            </Stack>

            <H3>Mức 2 — Hiểu</H3>
            <Stack gap="inline">
              <QA code="Q7" level="Hiểu" tone="info" revealed={isOpen("q7")} onToggle={() => toggle("q7")}
                question="Vì sao bài chọn macro-F1 làm metric chính thay vì accuracy?"
                answer={<Text size="small">Hai lý do. (1) Sáu lớp có kích thước gần bằng nhưng không bằng nhau (398 đến 484), nên accuracy lệch nhẹ về lớp lớn và che giấu hiệu năng lớp nhỏ. (2) Quan trọng hơn: thứ quyết định giá trị nông học là RECALL TỪNG LỚP — bỏ sót một bệnh lây lan nhanh đắt hơn nhiều so với báo nhầm. Macro-F1 lấy trung bình F1 từng lớp với trọng số ngang nhau nên phạt nặng việc bỏ sót một lớp. Bài vẫn báo thêm balanced accuracy, accuracy, precision/recall/F1 từng lớp và ma trận nhầm lẫn.</Text>} />
              <QA code="Q8" level="Hiểu" tone="info" revealed={isOpen("q8")} onToggle={() => toggle("q8")}
                question="Vì sao augmentation cố tình để nhẹ, trong khi augmentation mạnh thường làm tăng điểm?"
                answer={<Text size="small">Để baseline không bị NHIỄU (confounded) với việc tìm kiếm augmentation. Nếu augment mạnh rồi so sánh frozen với end-to-end, sẽ không biết chênh lệch đến từ pipeline hay từ chiến lược augmentation. Bài muốn cô lập biến số đang nghiên cứu. Ngoài ra Table S2 cho thấy augment có chủ đích vào hai lớp khó cũng không cải thiện macro-F1 (0.9050 so với 0.9088), nên giả định "augment mạnh sẽ cứu được" không được dữ liệu ủng hộ trong protocol này.</Text>} />
              <QA code="Q9" level="Hiểu" tone="info" revealed={isOpen("q9")} onToggle={() => toggle("q9")}
                question="'Không phát hiện khác biệt' khác 'hai mô hình tương đương' ở chỗ nào? Muốn khẳng định tương đương thì phải làm gì?"
                answer={<Text size="small">p lớn trong McNemar chỉ nói: dữ liệu hiện có KHÔNG ĐỦ để bác bỏ giả thuyết không. Đó là absence of evidence, không phải evidence of absence. Với chỉ 8 ảnh bất đồng trên 394, phép kiểm định gần như không có khả năng phát hiện một khác biệt nhỏ. Muốn khẳng định tương đương thì phải làm EQUIVALENCE TEST (ví dụ TOST) với một biên tương đương được định nghĩa TRƯỚC — bài này không làm, nên không được nói tương đương. Điều bài được phép nói: khoảng cách quan sát được rất nhỏ và nằm trong khoảng biến thiên giữa các seed.</Text>} />
              <QA code="Q10" level="Hiểu" tone="info" revealed={isOpen("q10")} onToggle={() => toggle("q10")}
                question="Vì sao in-domain macro-F1 ở Table 5 là 0.9889, CAO HƠN hẳn 0.9255 ở Table 3?"
                answer={<Text size="small">Vì đó là một bài toán DỄ HƠN. 0.9889 chỉ tính trên 4 lớp chung (Algal, Blight, Healthy, Phomopsis) và trên 273 ảnh test của bộ nguồn thuộc 4 lớp đó. Hai lớp bị loại khỏi phép so là Rhizoctonia và Colletotrichum — trong đó Colletotrichum thuộc nhóm khó nhất. Bỏ lớp khó ra thì điểm tất nhiên nhảy vọt. Phép so sánh vẫn hợp lệ vì CẢ HAI VẾ đều dùng cùng một không gian nhãn 4 lớp, nhưng không được đặt 0.9889 cạnh 0.9255 như thể cùng một bài toán.</Text>} />
              <QA code="Q11" level="Hiểu" tone="info" revealed={isOpen("q11")} onToggle={() => toggle("q11")}
                question="Vì sao head đóng băng nhẹ hơn 98 lần mà latency end-to-end lại không giảm?"
                answer={<Text size="small">Vì head nhận ĐẦU VÀO là embedding, không phải ảnh. Muốn có embedding thì phải chạy forward pass của backbone trước. Nên latency end-to-end do backbone chi phối: teacher 8.291 ms, frozen LR 8.394 ms, linear SVC 8.419 ms — gần như y hệt, thậm chí nhỉnh hơn vì thêm một bước. Chỉ số head-only (0.103 ms) là số đo RIÊNG của head, không phải số người dùng cảm nhận. Lợi ích thật nằm ở chi phí CẬP NHẬT: fit lại head trên embedding đã cache mất 1.28 s và 0.089 MB, so với 57.7 s và 8.748 MB khi fine-tune cả mạng.</Text>} />
              <QA code="Q12" level="Hiểu" tone="info" revealed={isOpen("q12")} onToggle={() => toggle("q12")}
                question="Hai quy tắc restricted và unrestricted trong đánh giá OOD khác nhau thế nào, và unrestricted đo cái gì?"
                answer={<Text size="small">Restricted: lấy argmax CHỈ trên 4 logit của các lớp chung — đây là cách xử lý chuẩn khi không gian nhãn không khớp, và là quy tắc tạo ra con số chính 0.3782. Unrestricted: lấy argmax trên CẢ 6 logit nguồn, ảnh nào rơi vào lớp không tồn tại ở bộ đích thì tính là sai; accuracy ra 0.4158. Unrestricted đo TẦN SUẤT MÔ HÌNH THOÁT KHỎI KHÔNG GIAN NHÃN HỢP LỆ: 91 trên 707 ảnh escape, trong đó Rhizoctonia 90 và Colletotrichum 1. Việc dồn vào một lớp nguồn nhất quán với sự nhạy cảm với khác biệt về cách chụp hoặc ngoại quan, nhưng thí nghiệm này KHÔNG xác định được cue chịu trách nhiệm.</Text>} />
            </Stack>

            <H3>Mức 3 — Vận dụng</H3>
            <Stack gap="inline">
              <QA code="Q13" level="Vận dụng" tone="warning" revealed={isOpen("q13")} onToggle={() => toggle("q13")}
                question="Một trạm khuyến nông ở một tỉnh khác muốn dùng ngay mô hình này để chẩn đoán cho vườn của họ. Em khuyên gì?"
                answer={<Text size="small">KHÔNG nên dùng ngay ở chế độ zero-shot. Table 5 cho thấy trên một bộ Việt Nam độc lập, macro-F1 rơi còn 0.3782 và balanced accuracy 0.4199 — gần mức đoán mò có trọng số. Cụ thể em nên khuyên: (1) nếu vẫn dùng, phải dùng như CÔNG CỤ SÀNG LỌC có người kiểm tra, hiển thị top-2 kèm độ tin cậy và định tuyến ca mơ hồ cho cán bộ chuyên môn; (2) thu thập một lượng ảnh có nhãn tại địa phương rồi THỬ FIT LẠI HEAD TRƯỚC, vì Table 6 cho thấy đó là thao tác rẻ nhất (1.28 s, 0.089 MB); (3) nói rõ rằng bài CHƯA chứng minh head re-fitting sẽ đủ để cứu dịch chuyển — head đóng băng cũng rơi gần như teacher, nên có thể cần can thiệp sâu hơn ở biểu diễn; (4) ghi nhận rằng việc cần bao nhiêu nhãn vẫn là câu hỏi mở trong Future Work.</Text>} />
              <QA code="Q14" level="Vận dụng" tone="warning" revealed={isOpen("q14")} onToggle={() => toggle("q14")}
                question="Một bệnh thứ 7 xuất hiện trong vùng. Quy trình cập nhật rẻ nhất theo bài này là gì, và bài đã chứng minh tới đâu?"
                answer={<Text size="small">Quy trình bài đề xuất: giữ lại backbone đã được xác nhận, thu thập ảnh có nhãn của bệnh mới, rồi fit lại head trên embedding đã cache — 1.28 s và 0.089 MB, thay vì fine-tune cả mạng 57.7 s và 8.748 MB. NHƯNG phải nói đúng giới hạn: bài đo chi phí này TRÊN EMBEDDING ĐÃ CACHE, và CHƯA định lượng cần bao nhiêu nhãn. Thêm một vấn đề kỹ thuật bài không giải quyết: head hiện tại là lớp 6-way; thêm lớp thứ 7 nghĩa là phải đổi head thành 7-way, và embedding của backbone vốn được fine-tune trên 6 lớp — liệu nó có tách được lớp mới không thì bài chưa kiểm tra. Bài cũng chưa có nghiên cứu triển khai on-device gồm cache embedding và lưu trữ trên thiết bị.</Text>} />
              <QA code="Q15" level="Vận dụng" tone="warning" revealed={isOpen("q15")} onToggle={() => toggle("q15")}
                question="Nếu chỉ được giữ MỘT bảng để thuyết phục một người hoài nghi về giá trị của bài, em chọn bảng nào và vì sao?"
                answer={<Text size="small">Chọn TABLE 6, nhưng phải trình bày kèm câu phủ định về latency. Lý do: Table 6 là nơi đóng góp trung tâm của bài hiện ra — một đại lượng (chi phí cập nhật) mà các bài deployment-aware thường bỏ qua, được ĐO chứ không suy đoán, và đi kèm một tuyên bố trung thực rằng latency KHÔNG cải thiện. Chính sự kết hợp "đo được lợi ích + nói rõ chỗ không có lợi ích" mới là thứ thuyết phục người hoài nghi. Nếu chọn Table 3 thì người ta sẽ hỏi "vậy thì sao, có hơn gì ai đâu"; nếu chọn Table 5 thì bài chỉ còn là một kết quả âm. Lưu ý: nếu đối tượng là người làm phương pháp luận thì chọn Table 4, vì nó chứng minh luận điểm rằng các bài hybrid nên kèm kiểm định ý nghĩa.</Text>} />
              <QA code="Q16" level="Vận dụng" tone="warning" revealed={isOpen("q16")} onToggle={() => toggle("q16")}
                question="Em có 50 ảnh có nhãn từ một vườn mới. Dựa vào kết quả của bài, em thử gì trước và kỳ vọng thực tế ra sao?"
                answer={<Text size="small">Thử HEAD RE-FITTING trước, vì đó là thao tác rẻ nhất đã được đo (1.28 s trên embedding đã cache, head 0.089 MB). Kỳ vọng thực tế phải THẬN TRỌNG: (a) Table 5 cho thấy head đóng băng cũng rơi gần như teacher (0.3811 so với 0.3782), tức là vấn đề nằm ở BIỂU DIỄN — nếu backbone không encode được đặc trưng phân biệt của vườn mới thì đổi head không cứu được; (b) bài chưa định lượng số nhãn tối thiểu, nên 50 ảnh là một giả định chứ không phải kết quả đã kiểm chứng; (c) 50 ảnh chia cho 6 lớp thì mỗi lớp dưới 10 ảnh — rất dễ overfit, nên bắt buộc phải giữ một tập test địa phương KHÔNG dùng để fit và báo cáo trên đó; (d) nếu head re-fitting không đủ, bước tiếp theo mới là full fine-tuning, và khi đó cần tính cả chi phí 57.7 s cùng yêu cầu GPU.</Text>} />
              <QA code="Q17" level="Vận dụng" tone="warning" revealed={isOpen("q17")} onToggle={() => toggle("q17")}
                question="Một bài báo khác công bố hybrid của họ đạt 0.930 trên CÙNG bộ dữ liệu này, hơn teacher 0.9255, và tuyên bố cải thiện. Em nhận xét gì?"
                answer={<Text size="small">Đây chính xác là tình huống bài này cảnh báo ở Discussion. Bốn điểm phải hỏi lại: (1) Họ chạy BAO NHIÊU SEED? Độ lệch chuẩn giữa các seed của bài này là 0.0119, nên một chênh lệch 0.005 nhỏ hơn nửa độ lệch chuẩn — hoàn toàn có thể do nhiễu. (2) Họ có KIỂM ĐỊNH Ý NGHĨA không (McNemar / bootstrap CI)? Nếu chỉ so hai điểm ước lượng thì chưa đủ cơ sở. (3) Họ chọn cấu hình theo VALIDATION hay theo TEST? Chọn theo test là leakage. (4) Họ có dùng ĐÚNG split 1814/387/394 của tác giả dữ liệu không? Bài này cố tình giữ nguyên split để so sánh được. Câu chốt: "trên bộ dữ liệu này, một nghiên cứu so một lần chạy hybrid với một lần chạy end-to-end hoàn toàn có thể báo cáo một cải thiện theo BẤT KỲ hướng nào" — nên con số 0.930 chưa phải bằng chứng.</Text>} />
              <QA code="Q18" level="Vận dụng" tone="warning" revealed={isOpen("q18")} onToggle={() => toggle("q18")}
                question="Nếu thiết kế một ứng dụng cho nông hộ dựa trên kết quả bài này, giao diện nên xử lý hai lớp khó thế nào?"
                answer={<Text size="small">Design implication bài nêu rõ: KHÔNG phát ra một nhãn đơn độc vô điều kiện. Cụ thể: (1) hiển thị TOP-2 DỰ ĐOÁN kèm ĐỘ TIN CẬY; (2) nếu top-1 và top-2 rơi vào cặp Blight/Colletotrichum hoặc độ cách biệt nhỏ, chuyển sang luồng ĐỊNH TUYẾN CHO CHUYÊN GIA (gửi ảnh + vị trí vườn + ngày chụp lên cán bộ nông nghiệp) thay vì kết luận; (3) dùng nhánh đặc trưng thủ công làm KÊNH GIẢI THÍCH — hiển thị những đại lượng cán bộ kiểm chứng được bằng mắt như độ sáng lá, số đốm tổn thương, tỉ lệ diện tích tổn thương, vì đó là các đặc trưng có mean |SHAP| cao nhất trong nhánh; (4) KHÔNG hiển thị ước lượng mức độ nặng hay khuyến nghị phun thuốc, vì bài nói rõ không có thành phần nào tạo ra hai thứ đó; (5) ghi log để tạo dữ liệu cho vòng thích nghi site sau này, vì đó chính là thứ Future Work đang thiếu.</Text>} />
            </Stack>

            <H3>Mức 4 — Phản biện</H3>
            <Stack gap="inline">
              <QA code="Q19" level="Phản biện" tone="danger" revealed={isOpen("q19")} onToggle={() => toggle("q19")}
                question="Điểm yếu phương pháp luận lớn nhất của bài là gì?"
                answer={<Text size="small">Có ba ứng viên, và em nên nêu được cả ba thay vì chỉ một. (1) NGOẠI LỆ ĐƠN: mọi kết luận in-domain dựa trên MỘT release, hai tỉnh, 2595 ảnh; kết luận OOD dựa trên MỘT bộ đích. Không có khả năng khái quát hoá thống kê ra quần thể vườn. (2) DỊCH CHUYỂN BỊ NHIỄU: hai bộ khác nhau ở thiết bị chụp, cách lấy khung hình, tiền xử lý VÀ độ phân giải cùng lúc, nên 0.3782 không quy được nguyên nhân — đây là hạn chế thiết kế nghiêm trọng nhất của Table 5. (3) POWER THẤP ở phép so seed: chỉ 3 cặp, paired t p = 0.1830 mà chính bài thừa nhận là power thấp. Ngoài ra còn một điểm nên tự nhận: bài so teacher với hybrid CONCAT (0.9207) chứ không với cấu hình frozen tốt nhất (0.9235) — đúng protocol chọn theo validation, nhưng khiến phép kiểm định hơi bảo thủ.</Text>} />
              <QA code="Q20" level="Phản biện" tone="danger" revealed={isOpen("q20")} onToggle={() => toggle("q20")}
                question="Việc chọn hybrid concat 0.9207 để kiểm định, thay vì embedding-only 0.9235, có phải là tự làm yếu kết quả của mình không?"
                answer={<Text size="small">Không — và đây là một quyết định phương pháp luận ĐÁNG KHEN, em nên chủ động bảo vệ nó. Lý do: cấu hình đưa vào kiểm định phải được chọn theo VALIDATION, không theo TEST. Hybrid concat có val macro-F1 0.9450, cao hơn val 0.9445 của embedding-only LR, nên nó là cấu hình được protocol chọn. Nếu chọn embedding-only vì test của nó cao hơn thì đó là cherry-picking trên test và làm hỏng toàn bộ lập luận chống leakage của bài. Hệ quả: phép kiểm định trở nên BẢO THỦ HƠN một chút (so với cấu hình test kém hơn), điều đó chỉ làm kết luận "không phát hiện khác biệt" an toàn hơn chứ không yếu đi. Lưu ý thêm: cả hai đều gần như ngang teacher, nên việc chọn cấu hình nào không đổi được kết luận.</Text>} />
              <QA code="Q21" level="Phản biện" tone="danger" revealed={isOpen("q21")} onToggle={() => toggle("q21")}
                question="Kết luận 'giới hạn supervision' có bị suy diễn quá từ việc ba can thiệp thất bại không?"
                answer={<Text size="small">Có rủi ro suy diễn quá, và em nên thừa nhận điều đó thay vì cố bảo vệ tuyệt đối. Ba can thiệp đã thử đều nhắm vào HÀM MẤT MÁT và LẤY MẪU; chúng không phủ hết không gian giải pháp — chưa thử backbone lớn hơn, chưa thử self-supervised pretraining trên ảnh lá, chưa thử loss cấp metric, chưa thử ensemble, chưa thử kiến trúc chú ý đến viền tổn thương. Nên về mặt logic, "ba cách này không ăn" không suy ra "không cách nào ăn". BÀI BÁO XỬ LÝ ĐIỀU NÀY BẰNG CÁCH HẠ GIỌNG: viết "nhất quán với một giới hạn supervision", và ghi rõ trong Limitations rằng đây "không phải bằng chứng các mô hình hay chiến lược huấn luyện khác không thể giúp". Bằng chứng HỖ TRỢ cho cách đọc đó là: trọng số chỉ 0.89–1.08, tỉ lệ lớp 1.22×, Grad-CAM cho thấy mô hình đã nhìn đúng vùng tổn thương, và nhầm lẫn xảy ra theo cả hai chiều. Vậy câu trả lời tốt là: kết luận được trình bày ở mức hypothesis có bằng chứng hỗ trợ, không ở mức khẳng định nhân quả.</Text>} />
              <QA code="Q22" level="Phản biện" tone="danger" revealed={isOpen("q22")} onToggle={() => toggle("q22")}
                question="Chỉ 3 seed và 8 trên 394 ảnh bất đồng — phép kiểm định có đủ power không?"
                answer={<Text size="small">KHÔNG, và bài biết điều đó. Đây là điểm em nên tự nói ra trước. Với 8 ảnh bất đồng (5 so với 3), McNemar gần như không thể đạt ý nghĩa ở α = 0.05 — phép kiểm định chỉ nhạy khi số bất đồng lớn và lệch rõ. Seed-paired t-test với n = 3 thì bài tự ghi chú "power thấp" ngay trong Table 4. Cách xử lý đúng, và là cách bài đã làm: KHÔNG dựa vào một phép kiểm định duy nhất mà dùng BA bằng chứng bổ sung — McNemar trên từng ảnh, one-vs-rest cho từng lớp, và bootstrap CI 2000 lần cho độ lớn của hiệu. Bootstrap CI đặc biệt hữu ích vì nó cho biết ĐỘ LỚN chứ không chỉ có/không ý nghĩa: [−0.0094, +0.0198] nghĩa là ngay cả cận trên cũng nhỏ hơn một độ lệch chuẩn giữa các seed (0.0119). Và chính vì power thấp nên bài KHÔNG khẳng định tương đương — chỉ khẳng định không phát hiện khác biệt.</Text>} />
              <QA code="Q23" level="Phản biện" tone="danger" revealed={isOpen("q23")} onToggle={() => toggle("q23")}
                question="Một kết quả âm thì có đáng được công bố không? Đóng góp mới ở đâu nếu độ chính xác không tăng?"
                answer={<Text size="small">Đây là câu hỏi đã được đặt ra THẬT trong checklist gửi mentor, nên em cần một câu trả lời đã suy nghĩ sẵn. Ba luận điểm: (1) Kết quả âm có KIỂM ĐỊNH là thông tin có giá trị, vì văn liệu về hybrid deep + classical gần như không bao giờ định lượng đóng góp biên của nhánh thủ công, và theo bài là "gần như không bao giờ được kiểm định ý nghĩa". Bài này làm cả hai và tìm ra nhánh đó không có lợi ích dự đoán — điều này giúp các nhóm khác không lặp lại công sức vô ích. (2) Bài định nghĩa và ĐO một đại lượng bị bỏ quên: chi phí RE-FITTING, khác với latency/memory/size mà ai cũng đo. (3) Hệ quả phương pháp luận tổng quát: vì chênh lệch ở đây nằm gọn trong biến thiên giữa các seed, một bài chỉ chạy mỗi cấu hình một lần trên bộ dữ liệu này có thể công bố "cải thiện" theo bất kỳ hướng nào — nên bài lập luận rằng các pipeline hybrid NÊN kèm kiểm định ý nghĩa. Đó là một đóng góp về văn hoá đánh giá, không chỉ về con số.</Text>} />
              <QA code="Q24" level="Phản biện" tone="danger" revealed={isOpen("q24")} onToggle={() => toggle("q24")}
                question="Điều gì, nếu có, sẽ thay đổi các kết luận của bài nhiều nhất?"
                answer={<Text size="small">Xếp theo mức độ tác động: (1) MỘT NGHIÊN CỨU ĐA SITE — nếu chuyển giao sang 4–5 vườn khác nhau mà hiệu năng vẫn giữ, thì Table 5 từ "giới hạn nghiêm trọng" sẽ thành "một ngoại lệ của bộ đích đó"; ngược lại nếu site nào cũng rơi thì giới hạn được khẳng định chắc hơn nhiều. (2) TÁCH BIẾN DỊCH CHUYỂN — nếu thu thập được ảnh của CÙNG một vườn bằng CẢ HAI thiết bị, sẽ quy được phần nào của 0.6107 là do thiết bị, phần nào do bệnh lý địa phương. (3) NHÃN CẤP TỔN THƯƠNG — nếu có lesion-level annotation cho Blight và Colletotrichum, kết luận "giới hạn supervision" sẽ được kiểm tra trực tiếp thay vì suy ra từ ba can thiệp thất bại. (4) ĐO TRÊN THIẾT BỊ EDGE THẬT — nếu Jetson/Raspberry Pi cho latency khác hẳn, phần deployment của bài phải viết lại. (5) SỐ NHÃN TỐI THIỂU cho head re-fitting — con số này sẽ biến khuyến nghị workflow từ "nên thử head trước" thành "cần ít nhất N nhãn thì head re-fitting có tác dụng".</Text>} />
            </Stack>
          </Stack>
        </ReportSection>
        {/* ================= 12. PHÒNG THỦ ================= */}
        <ReportSection
          title="12. Mười bốn câu hỏi hội đồng hay đặt ra — và cách phòng thủ"
          description="Mỗi câu có hai phần: cách trả lời SAI (làm mất điểm) và cách trả lời ĐÚNG. Bấm dấu + để mở. Hai câu cuối là về những điểm chưa nhất quán có thật trong bài."
          divided
        >
          <Stack gap="component">
            <DefenseRow revealed={isOpen("d1")} onToggle={() => toggle("d1")}
              q="Đóng góp mới của bài này là gì?"
              wrong="'Chúng em đề xuất một pipeline frozen-backbone mới cho ảnh lá sầu riêng.' — Sai, vì frozen-backbone là kỹ thuật có từ lâu, không phải đề xuất của bài."
              right="'Đóng góp của bài là về GIAO THỨC ĐÁNH GIÁ và CHI PHÍ, không phải kiến trúc. Cụ thể ba thứ: một benchmark tái lập được trên split chính thức với mean ± SD qua 3 seed; một phép đo tường minh chi phí CẬP NHẬT mô hình, đại lượng mà các bài deployment-aware thường bỏ qua; và một kiểm định ý nghĩa cho thấy nhánh đặc trưng thủ công không đóng góp giá trị dự đoán trên bộ dữ liệu này. Chúng em cố tình không claim SOTA.'" />

            <DefenseRow revealed={isOpen("d2")} onToggle={() => toggle("d2")}
              q="0.9235 có phải là state-of-the-art không? Sao không so với các bài khác?"
              wrong="'Vâng, 0.9235 cao hơn teacher 0.9088 nên đây là kết quả tốt nhất.' — Sai ở hai chỗ: so sai cặp số, và claim SOTA mà bài không hề đưa ra."
              right="'Không. Bài không so sánh cross-paper và không claim SOTA, vì các bài trong văn liệu khác nhau về định nghĩa split, số seed và metric, nên các con số tuyệt đối gần như không so sánh được. Đó chính là lý do chúng em cố định split của tác giả dữ liệu và công bố artefact của mọi con số. Trong phạm vi bài, 0.9235 là đầu LR trên embedding đóng băng ở seed được chọn theo validation, so với 0.9255 của teacher — tức giữ 99.78%. Một điểm cao hơn từ architecture search sẽ không thay đổi bất kỳ kết luận nào của bài.'" />

            <DefenseRow revealed={isOpen("d3")} onToggle={() => toggle("d3")}
              q="Tại sao chỉ dùng MobileNetV2? Sao không thử ResNet, EfficientNet hay Vision Transformer?"
              wrong="'Vì MobileNetV2 cho kết quả tốt nhất.' — Sai, bài không hề chạy architecture search nên không có cơ sở nói vậy."
              right="'Vì đối tượng nghiên cứu của bài không phải kiến trúc. MobileNetV2 được chọn làm MỘT backbone đại diện cho lớp mô hình gọn phù hợp phần cứng nông hộ (2.232M tham số, 8.75 MB). Nếu đổi backbone, các kết luận về việc không có khác biệt có ý nghĩa giữa teacher và hybrid, về chi phí cập nhật, về sự tập trung lỗi ở hai lớp hoại tử, và về sụp đổ ngoài miền vẫn giữ nguyên cấu trúc lập luận. Bài ghi rõ trong Scope: hành vi trên các backbone mới VẪN CÒN MỞ.'" />

            <DefenseRow revealed={isOpen("d4")} onToggle={() => toggle("d4")}
              q="2595 ảnh có quá ít không? Sao không gộp thêm các bộ khác để train?"
              wrong="'Ít nhưng đủ dùng ạ.' — Trống rỗng, không có lập luận."
              right="'Chúng em cố tình dùng MỘT release với split CHÍNH THỨC của tác giả dữ liệu và không gộp thêm, vì hai lý do. Thứ nhất, gộp bộ sẽ phá khả năng so sánh với các bài sau này trên cùng release. Thứ hai, và quan trọng hơn, một bộ độc lập được giữ RIÊNG để làm phép thử ngoài miền — nếu gộp vào train thì mất luôn Table 5. Bài thừa nhận rõ đây là hạn chế: dữ liệu train chỉ từ hai tỉnh, và cần một nghiên cứu đa site. Bộ dữ liệu có chất lượng nhãn được ghi nhận tốt: Cohen's kappa 0.85 giữa hai người gán nhãn, và 30% ảnh được hai kỹ sư nông nghiệp kiểm lại dưới hướng dẫn của một nhà bệnh học thực vật.'" />

            <DefenseRow revealed={isOpen("d5")} onToggle={() => toggle("d5")}
              q="McNemar p = 0.7266, tức là không có khác biệt. Vậy thí nghiệm đó để làm gì?"
              wrong="'Nghĩa là hai mô hình hoàn toàn tương đương nhau ạ.' — Sai lỗi suy luận thống kê cơ bản, mất điểm nặng."
              right="'Phép kiểm định trả lời một câu hỏi thực nghiệm mà bài đặt ra ngay từ Introduction: việc thay fine-tune cả mạng bằng fit lại head trên backbone đóng băng có MIỄN PHÍ về mặt độ chính xác hay không. p = 0.7266 cùng bootstrap CI [−0.0094, +0.0198] cho thấy trong giao thức này KHÔNG PHÁT HIỆN khác biệt — nhưng đây không phải là chứng minh tương đương tổng quát. Chúng em dùng đúng ngôn ngữ đó trong bài, và cố tình viết hai chiều để không ai đọc lệch. Giá trị của kết quả nằm ở chỗ nó cho phép đổi một thao tác đắt (57.7 s, 8.748 MB) lấy một thao tác rẻ (1.28 s, 0.089 MB) mà không phải đánh đổi độ chính xác đo được.'" />

            <DefenseRow revealed={isOpen("d6")} onToggle={() => toggle("d6")}
              q="Out-of-domain chỉ còn 0.3782. Vậy mô hình này có dùng được ở đâu không?"
              wrong="'Đó chỉ là một bộ dữ liệu khác thôi ạ.' — Chối bỏ kết quả của chính mình, rất tệ."
              right="'Chúng em coi đó là kết quả QUAN TRỌNG NHẤT của bài chứ không phải điểm yếu cần giấu. Bài viết thẳng: cấu hình đã đánh giá CHƯA được xác nhận cho chuyển vườn nếu không thích nghi. Trong phạm vi được xác nhận — cùng nguồn dữ liệu, cùng điều kiện chụp — mô hình đạt 0.9088 macro-F1 và có thể dùng làm công cụ SÀNG LỌC có người kiểm tra, với top-2 và độ tin cậy, định tuyến ca mơ hồ cho chuyên gia. Chi tiết đáng chú ý: head đóng băng cũng rơi gần như y hệt (0.3811), cho thấy vấn đề nằm ở BIỂU DIỄN chứ không phải ở đầu phân loại — nên chỉ đổi head là không đủ. Chính kết quả này dẫn tới khuyến nghị về nghiên cứu thích nghi site có chủ đích trong Future Work.'" />

            <DefenseRow revealed={isOpen("d7")} onToggle={() => toggle("d7")}
              q="Sao không fine-tune lại trên bộ dữ liệu đích rồi mới báo cáo?"
              wrong="'Vì không đủ thời gian ạ.'"
              right="'Vì làm vậy sẽ trả lời một CÂU HỎI KHÁC. Mục tiêu của Section IV.D là đo giới hạn của cấu hình ĐÃ ĐƯỢC XÁC NHẬN khi triển khai zero-shot — tức tình huống thực tế mà một trạm khuyến nông gặp khi nhận mô hình từ nơi khác mà chưa có dữ liệu địa phương. Nếu fine-tune trên bộ đích thì đó là một nghiên cứu thích nghi miền, và bài ghi rõ đó là hướng FUTURE WORK cần dữ liệu có nhãn tại đích. Chúng em cũng cố tình không làm vậy để giữ bộ đích hoàn toàn độc lập, tránh mọi rủi ro leakage vào các con số đã công bố.'" />

            <DefenseRow revealed={isOpen("d8")} onToggle={() => toggle("d8")}
              q="SHAP cho thấy nhánh thủ công chỉ chiếm 0.8%. Vậy sao không bỏ hẳn cho gọn?"
              wrong="'Bỏ thì gọn hơn nhưng chúng em chưa kịp thử ạ.' — Sai, bài đã thử và có số."
              right="'Vì nó vẫn có một vai trò khác, và bài tách bạch hai vai trò đó rõ ràng. Về DỰ ĐOÁN: nhánh thủ công không giúp — đứng riêng chỉ đạt 0.8151, ghép vào thì Δ ≈ 0 ở cả bốn head (Table S4). Về GIẢI THÍCH: những đặc trưng xếp hạng cao nhất — độ sáng lá, số đốm tổn thương, bin histogram độ bão hoà và tông màu, solidity — là các đại lượng một cán bộ nông nghiệp KIỂM CHỨNG ĐƯỢC BẰNG MẮT, trong khi chỉ số chiều embedding thứ 743 thì không. Bài kết luận vai trò đúng của nhánh này là KÊNH GIẢI THÍCH trình bày kèm dự đoán, không phải thành phần hiệu năng. Đây cũng là một phát hiện có giá trị cho văn liệu: các bài hybrid thường biện minh bằng độ chính xác, còn ở đây động cơ giải thích mới là động cơ đứng vững.'" />

            <DefenseRow revealed={isOpen("d9")} onToggle={() => toggle("d9")}
              q="Grad-CAM cho thấy mô hình nhìn đúng vào tổn thương. Vậy tại sao vẫn sai?"
              wrong="'Vì Grad-CAM chỉ là hình minh hoạ thôi ạ.' — Tự vứt bỏ bằng chứng của mình."
              right="'Chính vì mô hình đã nhìn đúng chỗ mà vẫn sai nên chúng em suy ra đây là MƠ HỒ THỊ GIÁC giữa hai bệnh lý tạo tổn thương hoại tử giống nhau, chứ không phải lỗi định vị. Suy luận này dẫn trực tiếp tới dự đoán: các biện pháp sửa lỗi định vị — attention tốt hơn, augmentation mạnh hơn — sẽ không hiệu quả. Và Section IV.C đã kiểm tra dự đoán đó: augmentation có chủ đích vào hai lớp khó cho macro-F1 0.9050, thấp hơn baseline 0.9088. Chúng em nhấn mạnh Grad-CAM là BẰNG CHỨNG ĐỊNH TÍNH và bài không đọc nhiều hơn thế từ nó.'" />

            <DefenseRow revealed={isOpen("d10")} onToggle={() => toggle("d10")}
              q="Latency 8 ms đo trên desktop. Trên điện thoại của nông dân thì sao?"
              wrong="'Khoảng 8 ms ạ, mô hình rất nhẹ.' — Sai, suy diễn ngoài dữ liệu."
              right="'Chúng em CHƯA ĐO trên thiết bị edge và bài ghi rõ điều đó trong Limitations. Latency được đo trên CPU desktop như một PROXY cho phần cứng thực địa; không có số trên Jetson hay Raspberry Pi. Vì vậy các con số latency TUYỆT ĐỐI chỉ nên đọc như so sánh TƯƠNG ĐỐI giữa các cấu hình trên cùng một máy. Điều chúng em khẳng định được ở mọi phần cứng: latency end-to-end của head đóng băng KHÔNG thấp hơn teacher, vì backbone vẫn phải chạy để tạo embedding. Lợi ích phần cứng nằm ở kích thước file head 0.089 MB so với checkpoint 8.748 MB — có ý nghĩa cho việc lưu trữ và phân phối bản cập nhật.'" />

            <DefenseRow revealed={isOpen("d11")} onToggle={() => toggle("d11")}
              q="Chỉ 3 seed thì có đủ không? Sao không chạy 10 seed?"
              wrong="'3 seed là đủ theo chuẩn ạ.' — Viện dẫn một chuẩn không tồn tại."
              right="'Chúng em thừa nhận n = 3 cho power thấp, và bài ghi chú điều đó NGAY TRONG Table 4 ở dòng seed-paired t-test (p = 0.1830, low power). Vì vậy bài không dựa vào một phép kiểm định duy nhất: có McNemar trên từng ảnh, one-vs-rest cho từng lớp, và bootstrap 2000 lần cho khoảng tin cậy của độ lớn. Ngoài ra bài bổ sung một trục ổn định THỨ HAI độc lập với seed: 5 lần xáo trộn tập huấn luyện trên pool 2201 ảnh train+val, đánh giá trên cùng 394 ảnh test, cho 0.8990 ± 0.0103. Hai tóm tắt chỉ lệch nhau 0.0098 — nhỏ hơn độ lệch chuẩn của chính chúng. Chúng em đồng ý rằng tăng số seed sẽ làm chặt thêm, và đó là một cải thiện hợp lý cho bản mở rộng.'" />

            <DefenseRow revealed={isOpen("d12")} onToggle={() => toggle("d12")}
              q="Nếu augmentation mạnh hơn nhiều, hoặc dùng pretraining self-supervised, thì có vượt qua được không?"
              wrong="'Có thể ạ, chúng em chưa thử.' — Nghe như thừa nhận bài làm chưa tới."
              right="'Có thể, và bài nói rõ điều đó trong Limitations: kết quả của chúng em KHÔNG phải bằng chứng rằng các mô hình hay chiến lược huấn luyện khác không giúp được. Phạm vi khẳng định là BA can thiệp cụ thể — class weighting nghịch đảo tần suất, focal loss với γ = 2.0, và augmentation ngoại tuyến có chủ đích vào hai lớp khó — dưới CÙNG backbone, split và ngân sách seed. Trong phạm vi đó, không can thiệp nào cải thiện macro-F1 và không can thiệp nào tăng được cả hai lớp khó cùng lúc. Điều làm chúng em nghiêng về phía giới hạn nhãn hơn là giới hạn huấn luyện là: trọng số nghịch tần suất chỉ trải 0.89–1.08, lớp lớn nhất chỉ gấp 1.22 lần lớp nhỏ nhất, và hai lớp yếu là lớp CỠ TRUNG BÌNH chứ không phải lớp thiểu số.'" />
            <DefenseRow revealed={isOpen("d13")} onToggle={() => toggle("d13")}
              q="Con số 0.8990 ± 0.0103 có phải là cross-validation không?"
              wrong="'Vâng ạ, đó là 5-fold cross-validation.' — Sai, và em sẽ bị bắt ngay vì Table 4 ghi rõ test cố định."
              right="'Về CƠ CHẾ CHIA thì đó là 5-fold stratified trên pool train+val gồm 2201 ảnh. Nhưng về GIAO THỨC ĐÁNH GIÁ thì không phải cross-validation theo nghĩa thông thường, vì mọi mô hình đều được đánh giá trên CÙNG một tập test 394 ảnh cố định, không đụng tới — còn cross-validation thường đánh giá trên chính fold bị giữ ra. Chúng em gọi đúng tên là 'training-set perturbations': nó đo độ nhạy của kết quả với việc chọn tập huấn luyện, chứ không tạo ra nhiều tập test. Mục đích là bổ sung một TRỤC ỔN ĐỊNH thứ hai, độc lập với trục seed. Hai tóm tắt lệch nhau 0.0098, nhỏ hơn độ lệch chuẩn của chính chúng.'" />

            <DefenseRow revealed={isOpen("d14")} onToggle={() => toggle("d14")}
              q="Table 3 nói mỗi họ lấy cấu hình tốt nhất theo VALIDATION. Nhưng họ 'chỉ thủ công' lại báo XGBoost (val 0.8258) trong khi LightGBM có val 0.8270 cao hơn?"
              wrong="'Vì XGBoost cho kết quả test tốt hơn ạ.' — Đây chính là cherry-picking trên test mà cả bài này lên án. Trả lời vậy là tự phá lập luận của mình."
              right="'Thầy/cô chỉ ra đúng một điểm chưa nhất quán trong cách trình bày Table 3. Theo quy tắc chọn theo validation mà bài công bố, dòng handcrafted phải là LightGBM (val 0.8270, test 0.8121) chứ không phải XGBoost (val 0.8258, test 0.8151). Chênh lệch val chỉ 0.0012 nên về thực chất hai head này ngang nhau, nhưng chúng em thừa nhận dòng đó chưa theo đúng quy tắc đã nêu. ĐIỀU QUAN TRỌNG là kết luận không đổi theo cả hai lựa chọn: 0.8121 hay 0.8151 đều kém cấu hình frozen-embedding tốt nhất khoảng 0.108 đến 0.111, tức đặc trưng thủ công đứng riêng KHÔNG cạnh tranh được. Ba họ còn lại đều tuân thủ đúng quy tắc: embedding chọn LR (val 0.9445, cao nhất), concat chọn LR (val 0.9450, cao nhất). Chúng em sẽ sửa caption hoặc sửa dòng đó ở bản camera-ready.'" />

            <Callout tone="warning" title="Hai điểm chưa nhất quán trong bài — biết trước để không bị bất ngờ">
              <Stack gap="inline">
                <Text size="small">
                  <b>(1) Cách gọi 0.8990.</b> Bản nộp cuối DOCX viết đúng là "five training-set
                  perturbations on a fixed test set". Nhưng Conclusion của bản thảo cũ
                  (<Code>paper_durian_leaf_submission.md</Code> và <Code>.tex</Code>) và tiêu đề
                  Supplementary S1 vẫn còn cụm "5-fold cross-validation". Nếu hội đồng cầm bản cũ, em trả
                  lời theo D13 ở trên và nói rõ bản nộp đã chỉnh lại. <b>Em nên đọc và trích theo bản
                  DOCX FINAL.</b>
                </Text>
                <Text size="small">
                  <b>(2) Dòng handcrafted trong Table 3.</b> Xem D14. Đây là lỗi trình bày có thật, không
                  ảnh hưởng kết luận, nhưng em phải <b>thừa nhận một cách bình tĩnh</b> thay vì chống chế.
                  Thừa nhận một lỗi nhỏ, không trọng yếu, kèm phân tích rằng kết luận không đổi — đó là
                  cách trả lời khiến hội đồng tin em hiểu công trình của mình. Chống chế một lỗi hiển nhiên
                  mới là thứ làm mất điểm nặng.
                </Text>
              </Stack>
            </Callout>
          </Stack>
        </ReportSection>

        {/* ================= 13. KỊCH BẢN THUYẾT TRÌNH ================= */}
        <ReportSection
          title="13. Kịch bản thuyết trình 15 phút"
          description="Mười slide, có mốc thời gian và câu phải nói đúng ý. Tập nói to, bấm giờ, ghi âm lại."
          divided
        >
          <Stack gap="container">
            <Timeline
              events={[
                {
                  id: "s1",
                  timestamp: "0:00 – 1:00 · Slide 1",
                  title: "Vấn đề và câu hỏi nghiên cứu",
                  description:
                    "Mở bằng bối cảnh: sầu riêng là cây giá trị cao, chẩn đoán bệnh lá vẫn dựa vào quan sát mắt của cán bộ khuyến nông vốn rất mỏng. Rồi đọc câu hỏi nghiên cứu ĐÚNG như bài viết: frozen-backbone có giữ được hiệu năng trong miền và giảm chi phí cập nhật head không, và trade-off đó có chịu được kiểm định thống kê không. Nói ngay: đây là bài đánh giá pipeline, KHÔNG phải kiến trúc mới.",
                  state: "current",
                  tone: "info",
                },
                {
                  id: "s2",
                  timestamp: "1:00 – 2:30 · Slide 2",
                  title: "Vì sao 'chính xác' là chưa đủ — ba yêu cầu triển khai",
                  description:
                    "Ba yêu cầu: compute vừa phải, đầu ra giải thích được, cập nhật rẻ. Chỉ ra khoảng trống trong văn liệu: yêu cầu 1 được báo cáo thường xuyên, yêu cầu 2 thỉnh thoảng, yêu cầu 3 GẦN NHƯ KHÔNG BAO GIỜ. Nhấn mạnh chi phí re-fitting là chi phí LẶP LẠI, vì nhãn tăng theo mùa và mô hình phải fit lại khi chuyển tỉnh.",
                  state: "upcoming",
                  tone: "info",
                },
                {
                  id: "s3",
                  timestamp: "2:30 – 4:00 · Slide 3",
                  title: "Dữ liệu và giao thức",
                  description:
                    "2595 ảnh, 6 lớp, split chính thức 1814/387/394 giữ nguyên. DOI và CC BY 4.0. Chất lượng nhãn: kappa 0.85, 30% được kiểm lại. Lớp lớn nhất chỉ gấp 1.22 lần lớp nhỏ nhất — nói câu này sớm, nó sẽ được dùng lại ở slide 8. Teacher MobileNetV2, 3 seed, chọn seed theo VALIDATION. Augmentation cố tình nhẹ để không nhiễu biến số.",
                  state: "upcoming",
                },
                {
                  id: "s4",
                  timestamp: "4:00 – 6:00 · Slide 4",
                  title: "Table 3 — bốn họ mô hình",
                  description:
                    "Hiện bảng. Đọc: teacher 0.9255, frozen LR 0.9235, concat LR 0.9207, handcrafted XGBoost 0.8151. Nói ngay câu chống hiểu lầm: 'Trung bình 3 seed của teacher là 0.9088 và nằm ở Table 4; cột này là cấu hình chọn theo validation, nên KHÔNG được so 0.9235 với 0.9088.' Nhắc Table S4: Δ của việc ghép đặc trưng thủ công là +0.0024, +0.0001, +0.0000, −0.0028 — tức xấp xỉ 0 ở cả bốn head.",
                  state: "upcoming",
                  tone: "success",
                },
                {
                  id: "s5",
                  timestamp: "6:00 – 8:00 · Slide 5",
                  title: "Table 4 — kiểm định thống kê (slide quan trọng nhất về phương pháp luận)",
                  description:
                    "Hai trục ổn định: 3 seed cho 0.9088 ± 0.0119; 5 lần xáo trộn tập train trên test cố định cho 0.8990 ± 0.0103; hai tóm tắt lệch 0.0098, nhỏ hơn SD của chính chúng. Rồi McNemar: chỉ 8 trên 394 ảnh bất đồng (5 so với 3), p = 0.7266. Bootstrap CI [−0.0094, +0.0198] chứa 0. NÓI RÕ câu then chốt: 'không phát hiện khác biệt KHÔNG PHẢI là chứng minh tương đương'. Thêm hệ quả cho văn liệu: một bài chạy mỗi cấu hình một lần trên bộ này có thể báo cáo cải thiện theo bất kỳ hướng nào.",
                  state: "upcoming",
                  tone: "warning",
                },
                {
                  id: "s6",
                  timestamp: "8:00 – 9:30 · Slide 6",
                  title: "Table 6 — chi phí cập nhật, và điều bài KHÔNG khẳng định",
                  description:
                    "1.28 s so với 57.7 s = 45.1 lần; 0.089 MB so với 8.748 MB; giữ 99.78% macro-F1. RỒI CHỦ ĐỘNG NÓI CÂU PHỦ ĐỊNH trước khi bị hỏi: 'Latency end-to-end KHÔNG giảm — 8.394 ms so với 8.291 ms — vì backbone vẫn phải chạy để tạo embedding. Lợi ích đo được là chi phí cập nhật, không phải tốc độ suy luận.' Đây là lúc em ghi điểm về sự trung thực khoa học.",
                  state: "upcoming",
                  tone: "success",
                },
                {
                  id: "s7",
                  timestamp: "9:30 – 11:30 · Slide 7",
                  title: "Table 5 — giới hạn chuyển miền",
                  description:
                    "Hiện Figure 5 nếu có. 0.9889 xuống 0.3782, Δ = −0.6107; head đóng băng 0.9850 xuống 0.3811. Giải thích NGAY vì sao in-domain cao hơn Table 3: chỉ còn 4 lớp chung, đã loại Colletotrichum và Rhizoctonia, và chỉ trên 273 ảnh. Quy tắc restricted so với unrestricted: 91 trên 707 ảnh thoát khỏi không gian nhãn hợp lệ, dồn vào Rhizoctonia (90). Kết luận: chưa được xác nhận cho chuyển vườn nếu không thích nghi; head rơi tương tự nên vấn đề nằm ở biểu diễn. Nhắc giới hạn: hai bộ khác nhau ở thiết bị, khung hình, tiền xử lý VÀ độ phân giải cùng lúc nên không quy được nguyên nhân.",
                  state: "upcoming",
                  tone: "danger",
                },
                {
                  id: "s8",
                  timestamp: "11:30 – 13:00 · Slide 8",
                  title: "Phân tích lỗi, ba can thiệp thất bại, và interpretability",
                  description:
                    "28 trên 394 ảnh sai; 26 (92.9%) dính Blight và Colletotrichum. Nhầm hai chiều: Colle→Blight 8, Blight→Colle 6, Blight→Rhizo 5. Grad-CAM cho thấy activation đúng vào tổn thương, nên đây là mơ hồ thị giác chứ không phải lỗi định vị. Ba can thiệp đều không cải thiện; tốt nhất chỉ −0.0038, trong một SD. Lập luận then chốt: trọng số nghịch tần suất chỉ 0.89–1.08 và tỉ lệ lớp 1.22×, nên đây là giới hạn SUPERVISION, không phải mất cân bằng lớp. Chuyển sang SHAP: nhánh thủ công 0.8% importance nhưng các đặc trưng hàng đầu đều đọc được bằng mắt — nên giữ nó làm kênh giải thích.",
                  state: "upcoming",
                  tone: "warning",
                },
                {
                  id: "s9",
                  timestamp: "13:00 – 14:30 · Slide 9",
                  title: "Hạn chế, phạm vi, future work",
                  description:
                    "Đừng đọc hết 8 hạn chế — chọn 4 và nói gọn: một release hai tỉnh; một bộ đích và dịch chuyển bị nhiễu; latency chỉ là proxy desktop, chưa đo edge; không có nhãn lesion-level. Đọc câu chốt phạm vi: 'đây là một nghiên cứu tình huống được kiểm định cẩn thận, không phải quy luật chung'. Future work ba việc: nghiên cứu thích nghi site có chủ đích, định lượng số nhãn cần cho head re-fitting so với full fine-tuning, và thêm nhãn cấp tổn thương.",
                  state: "upcoming",
                },
                {
                  id: "s10",
                  timestamp: "14:30 – 15:00 · Slide 10",
                  title: "Chốt",
                  description:
                    "Ba câu: (1) Trên bộ lá sầu riêng Việt Nam, frozen-backbone giữ gần như nguyên hiệu năng trong miền với chi phí cập nhật thấp hơn nhiều. (2) Không có bằng chứng đặc trưng thủ công giúp ích cho dự đoán, nhưng nó cung cấp kênh giải thích. (3) Một kiểm tra zero-shot cho thấy pipeline CHƯA được xác nhận cho chuyển vườn — và chính giới hạn đó định nghĩa việc tiếp theo. Cảm ơn và mời câu hỏi.",
                  state: "upcoming",
                  tone: "success",
                },
              ]}
            />

            <Divider />
            <H3>Sáu câu phải nói ĐÚNG ý (học thuộc)</H3>
            <Table
              headers={["#", "Câu phải nói"]}
              rows={[
                ["1", "Đây là một đóng góp về pipeline và đánh giá triển khai, không phải một kiến trúc mạng mới và không phải một tuyên bố state-of-the-art."],
                ["2", "Trong giao thức test này, chúng tôi không phát hiện khác biệt; điều đó không thiết lập sự tương đương tổng quát hay sự vượt trội theo bất kỳ hướng nào."],
                ["3", "Lợi ích đo được nằm ở chi phí cập nhật đầu phân loại, không phải ở latency suy luận — latency end-to-end không giảm vì backbone vẫn phải chạy."],
                ["4", "Cấu hình đã đánh giá chưa được xác nhận cho chuyển vườn nếu không có thích nghi; đây là một kiểm tra zero-shot trên một bộ đích, không phải một benchmark đa site."],
                ["5", "Lỗi còn lại nhất quán với một giới hạn của supervision hiện có, không phải với một lời giải thích bằng mất cân bằng lớp."],
                ["6", "Pipeline có thể hỗ trợ sàng lọc số có truy vết và chuyển tuyến, không phải quản lý bệnh tự động."],
              ]}
              rowTone={["accent", "accent", "accent", "accent", "accent", "accent"]}
            />

            <Callout tone="info" title="Mẹo trình bày">
              <Text size="small">
                Chủ động nói các câu phủ định TRƯỚC khi bị hỏi. Người trình bày tự chỉ ra chỗ mô hình
                của mình không dùng được nghe có vẻ yếu, nhưng thực tế lại là cách hiệu quả nhất để
                hội đồng tin rằng em hiểu đúng công trình của mình — và nó lấy mất câu hỏi khó nhất
                khỏi tay họ. Ngược lại, nếu em để họ tự phát hiện ra latency không giảm, toàn bộ phần
                còn lại sẽ bị nghi ngờ.
              </Text>
            </Callout>
          </Stack>
        </ReportSection>

        {/* ================= 14. TỪ ĐIỂN ================= */}
        <ReportSection
          title="14. Từ điển thuật ngữ Việt – Anh"
          description="Tra nhanh khi đọc bản tiếng Anh. Cột cuối là chỗ thuật ngữ đó xuất hiện trong bài."
          divided
        >
          <Stack gap="component">
            <Table
              density="compact"
              headers={["Thuật ngữ tiếng Anh", "Nghĩa tiếng Việt", "Giải thích ngắn", "Ở đâu trong bài"]}
              rows={[
                ["frozen backbone", "backbone đóng băng", "Mạng tích chập đã train xong, khoá trọng số, chỉ dùng để trích đặc trưng", "Toàn bài, đặc biệt Sec. III.C"],
                ["classifier head", "đầu phân loại", "Lớp cuối (thường tuyến tính) biến đặc trưng thành điểm cho từng lớp. Đây là thứ được fit lại", "Sec. III.C, Table 6"],
                ["teacher", "mô hình thầy", "Ở bài này chỉ đơn giản là MobileNetV2 đã fine-tune end-to-end, dùng làm mốc so sánh", "Table 3, 4, 5, 6"],
                ["embedding", "vector nhúng / biểu diễn sâu", "Vector 1280 chiều lấy ở lớp penultimate, là đầu vào cho head", "Sec. III.C"],
                ["handcrafted features", "đặc trưng thủ công", "71 số tính bằng công thức cổ điển: màu, histogram, kết cấu, hình dạng", "Table 2, Table S3"],
                ["GLCM", "ma trận đồng hiện mức xám", "Bộ mô tả kết cấu: contrast, homogeneity, energy, correlation, ASM", "Table 2"],
                ["LBP", "mẫu nhị phân cục bộ", "Bộ mô tả kết cấu dựa trên so sánh mỗi điểm ảnh với lân cận", "Table 2"],
                ["Otsu thresholding", "phân ngưỡng Otsu", "Tự chọn ngưỡng tách tổn thương khỏi lá trên kênh a*", "Table 2"],
                ["macro-F1", "F1 vĩ mô", "Trung bình F1 của từng lớp với trọng số ngang nhau. Metric chính của bài", "Sec. III.D"],
                ["balanced accuracy", "độ chính xác cân bằng", "Trung bình recall từng lớp; ít bị lệch bởi lớp lớn", "Table 3, 5"],
                ["held-out test set", "tập test giữ riêng", "394 ảnh chỉ đọc một lần để báo cáo cuối", "Sec. III.D"],
                ["seed", "hạt giống ngẫu nhiên", "Khởi tạo ngẫu nhiên; bài dùng 42, 43, 44", "Sec. III.B"],
                ["training-set perturbation", "xáo trộn tập huấn luyện", "Chia lại pool train+val thành 5 fold; test vẫn cố định", "Sec. III.D, Table 4"],
                ["McNemar's exact test", "kiểm định McNemar chính xác", "Kiểm định cho dữ liệu ghép cặp, chỉ dùng các ảnh hai mô hình bất đồng", "Table 4"],
                ["discordant images", "ảnh bất đồng", "Ảnh mà một mô hình đúng và mô hình kia sai. Ở đây 8 trên 394", "Table 4"],
                ["one-vs-rest test", "kiểm định một-lớp-so-phần-còn-lại", "Chạy McNemar riêng cho từng lớp", "Sec. III.D"],
                ["bootstrap confidence interval", "khoảng tin cậy bootstrap", "Lấy mẫu lại có hoàn lại 2000 lần để ước lượng phân bố của hiệu metric", "Table 4"],
                ["paired t-test, low power", "t-test ghép cặp, lực kiểm định thấp", "Chỉ 3 cặp seed nên khả năng phát hiện khác biệt thật rất kém", "Table 4"],
                ["equivalence test (TOST)", "kiểm định tương đương", "Thứ CẦN làm nếu muốn khẳng định tương đương. Bài không làm", "Không có trong bài — cần biết để trả lời"],
                ["statistical significance", "ý nghĩa thống kê", "Khác biệt khó giải thích bằng nhiễu. KHÔNG đồng nghĩa với khác biệt LỚN", "Sec. IV.B"],
                ["zero-shot transfer", "chuyển giao không huấn luyện lại", "Đem mô hình sang bộ dữ liệu mới, giữ nguyên trọng số", "Sec. III.E, Table 5"],
                ["out-of-domain (OOD)", "ngoài miền", "Dữ liệu khác phân bố với dữ liệu train", "Table 5"],
                ["domain shift", "dịch chuyển miền", "Sự khác biệt về phân bố giữa nguồn và đích (thiết bị, ánh sáng, vườn)", "Table 5, Limitations"],
                ["restricted rule", "quy tắc giới hạn", "Argmax chỉ trên các logit của lớp chung giữa hai bộ", "Sec. III.E"],
                ["unrestricted rule", "quy tắc không giới hạn", "Argmax trên cả 6 logit nguồn; rơi vào lớp không có ở đích thì tính sai", "Sec. III.E"],
                ["label space mismatch", "không gian nhãn không khớp", "Nguồn 6 lớp, đích ít hơn; cần quy tắc xử lý", "Sec. III.E"],
                ["head refitting", "fit lại đầu phân loại", "Huấn luyện lại chỉ phần head trên embedding đã cache", "Table 6 — lợi ích chính của bài"],
                ["update cost", "chi phí cập nhật", "Chi phí sửa mô hình khi nhãn hoặc site thay đổi. Đại lượng bài nhấn mạnh", "Toàn bài"],
                ["head-only vs end-to-end latency", "latency riêng head so với toàn tuyến", "Head-only bỏ qua backbone; end-to-end gồm backbone. Chỉ số sau mới là trải nghiệm thật", "Table 6"],
                ["cached embeddings", "embedding đã lưu sẵn", "Đặc trưng tính một lần rồi lưu ra đĩa để fit head nhanh", "Sec. III.F, Table 6"],
                ["SHAP value", "giá trị SHAP", "Đóng góp của từng đặc trưng vào một dự đoán cụ thể", "Sec. V, Table S3"],
                ["mean absolute SHAP", "|SHAP| trung bình", "Mức quan trọng toàn cục của một đặc trưng", "Table S3"],
                ["Grad-CAM", "bản đồ nhiệt Grad-CAM", "Bằng chứng ĐỊNH TÍNH cho thấy mạng chú ý vùng nào của ảnh", "Sec. IV.C, Figure S2/S3"],
                ["focal loss", "hàm mất mát focal", "Giảm trọng số mẫu dễ, tập trung vào mẫu khó. Bài dùng γ = 2.0", "Table S2"],
                ["class weighting", "trọng số lớp", "Phạt nặng hơn khi sai lớp ít mẫu. Ở bài trọng số chỉ 0.89–1.08", "Table S2"],
                ["inverse-frequency weights", "trọng số nghịch đảo tần suất", "Trọng số tỉ lệ nghịch số mẫu của lớp", "Sec. IV.C"],
                ["targeted augmentation", "augmentation có chủ đích", "Sinh thêm ảnh chỉ cho hai lớp khó; bài tạo 588 ảnh", "Sec. IV.C, Table S2"],
                ["necrotic lesion", "tổn thương hoại tử", "Loại đốm bệnh làm chết mô lá — nguyên nhân hai lớp khó trông giống nhau", "Sec. IV.C"],
                ["lesion-level annotation", "nhãn cấp tổn thương", "Nhãn khoanh vùng từng tổn thương. Bộ dữ liệu này KHÔNG có", "Limitations, Future Work"],
                ["supervision limit", "giới hạn của supervision", "Trần hiệu năng do chất lượng/độ chi tiết của nhãn, không phải do thuật toán", "Sec. IV.C"],
                ["human-in-the-loop", "có con người trong vòng lặp", "Định tuyến ca mơ hồ cho chuyên gia thay vì kết luận tự động", "Sec. V"],
                ["top-2 prediction with confidence", "top-2 kèm độ tin cậy", "Hiển thị hai khả năng cao nhất để người dùng tự đánh giá", "Sec. V"],
                ["Cohen's kappa", "hệ số kappa Cohen", "Độ đồng thuận giữa hai người gán nhãn, đã hiệu chỉnh ngẫu nhiên. Ở đây 0.85", "Sec. III.A"],
                ["CC BY 4.0", "giấy phép Creative Commons Ghi công 4.0", "Được dùng lại và sửa, bắt buộc ghi công tác giả dữ liệu", "Sec. III.A"],
                ["DOI", "định danh đối tượng số", "Địa chỉ vĩnh viễn của bộ dữ liệu và của bài Data in Brief", "Sec. III.A"],
              ]}
            />
          </Stack>
        </ReportSection>

        {/* ================= 15. CHECKLIST ================= */}
        <ReportSection
          title="15. Checklist sẵn sàng thuyết trình"
          description="Tích dần. Tiến trình được lưu lại giữa các lần mở canvas."
          divided
        >
          <Stack gap="component">
            <Progress
              value={doneCount}
              max={checklistItems.length}
              format="fraction"
              showLabel
              label="Hoàn thành"
              tone={doneCount === checklistItems.length ? "success" : "info"}
            />
            <Stack gap="inline">
              {checklistItems.map((item) => (
                <Checkbox
                  key={item.id}
                  label={item.label}
                  checked={!!checks[item.id]}
                  onChange={(v) => setChecks((prev) => ({ ...prev, [item.id]: v }))}
                />
              ))}
            </Stack>
            <Row gap="component" wrap>
              <Button variant="outline" size="sm" onClick={() => setChecks({})}>
                Đặt lại checklist
              </Button>
              <SendToChatButton
                variant="secondary"
                label="Báo cáo tiến độ với thầy"
                text={`Tiến độ đọc hiểu paper FAIR 2026 của em: ${doneCount}/${checklistItems.length} mục.\nĐã xong: ${checklistItems.filter((i) => !!checks[i.id]).map((i) => i.label).join(" | ") || "(chưa có)"}\nChưa xong: ${checklistItems.filter((i) => !checks[i.id]).map((i) => i.label).join(" | ") || "(không)"}`}
              />
            </Row>
          </Stack>
        </ReportSection>

        {/* ================= 16. NGUỒN ================= */}
        <ReportSection
          title="16. Nguồn tra cứu trong project"
          description="Mỗi con số đều có artefact. Khi bị chất vấn, mở đúng file ra là cách phòng thủ mạnh nhất."
          divided
        >
          <Stack gap="component">
            <ReferencePanel
              title="Tài liệu đọc"
              columns={2}
              items={[
                { id: "r1", label: "Bản nộp cuối (DOCX, IEEE 2 cột)", description: "FAIR2026_durian_leaf_submission_FINAL_2026-08-15.docx — bản chính thức để đọc và trích số", kind: "doc", meta: "root project" },
                { id: "r2", label: "Bản thảo Markdown sinh tự động", description: "paper_durian_leaf_submission.md — mọi số sinh từ artefact bằng scripts/make_paper.py, không sửa tay", kind: "file", meta: "root project" },
                { id: "r3", label: "Supplementary S1–S4", description: "paper_durian_leaf_supplementary.pdf — per-class CV, weak-class interventions, SHAP/Grad-CAM, lưới hybrid đầy đủ", kind: "doc", meta: "root project" },
                { id: "r4", label: "Hướng dẫn sinh viên (gói tái lập)", description: "fair2026-durian-repro/docs/STUDENT_GUIDE.md — đọc gì, chạy gì theo thứ tự A–F, ý nghĩa từng bảng, cách xử lý khi số lệch", kind: "doc", meta: "repro/docs" },
                { id: "r5", label: "Bản crosswalk số ↔ artefact", description: "fair2026-durian-repro/docs/REVIEWER.md — ánh xạ từng ô trong Table 3–6 tới đúng trường JSON/CSV", kind: "doc", meta: "repro/docs" },
                { id: "r6", label: "Abstract một trang (hedged)", description: "fair2026-durian-repro/paper/ABSTRACT.md — 5 đóng góp và 5 số kèm cách đọc đúng", kind: "doc", meta: "repro/paper" },
                { id: "r7", label: "Hành trình từ ĐATN đến bài báo", description: "huong_dan_sinh_vien_durian.html — tài liệu kể chuyện: v1.0, v2.0, 5 nhánh phát triển, bài học, từ điển thuật ngữ", kind: "doc", meta: "root project" },
                { id: "r8", label: "Thứ tự chạy script", description: "fair2026-durian-repro/src/NOTES.md — bước 0 đến 7, script nào chạy được, script nào chỉ tạo artefact", kind: "runbook", meta: "repro/src" },
              ]}
            />

            <ReferencePanel
              title="Artefact của từng con số"
              columns={2}
              items={[
                { id: "a1", label: "teacher_summary.json", description: "0.9088 ± 0.0119, seed lẻ 0.9255/0.8999/0.9009, best_seed 42, ma trận nhầm lẫn", kind: "metric", meta: "Table 3, 4" },
                { id: "a2", label: "teacher_cv_summary.json", description: "0.8990 ± 0.0103, khoảng 0.8886–0.9172, 5 perturbation trên pool 2201", kind: "metric", meta: "Table 4, S1" },
                { id: "a3", label: "model_comparison.csv", description: "Lưới Table 3: frozen LR 0.9235, concat LR 0.9207, handcrafted XGBoost 0.8151", kind: "metric", meta: "Table 3" },
                { id: "a4", label: "teacher_vs_hybrid_stats.json", description: "McNemar p = 0.7265625, 8/394 bất đồng, bootstrap CI [−0.0094, +0.0198], paired t p = 0.1830", kind: "metric", meta: "Table 4" },
                { id: "a5", label: "cross_dataset_eval.json", description: "0.9889 → 0.3782, frozen head 0.9850 → 0.3811, 91 escape, retrained = false", kind: "metric", meta: "Table 5" },
                { id: "a6", label: "deployment_tradeoff.csv / .json", description: "57.7 s vs 1.28 s = 45.1×, head 0.089 MB, e2e 8.291 vs 8.394 ms", kind: "metric", meta: "Table 6" },
                { id: "a7", label: "error_analysis_weak_classes.json", description: "28 lỗi test, 26 (92.9%) dính Blight/Colletotrichum, F1 0.8333 và 0.8421", kind: "metric", meta: "Sec. IV.C, S2" },
                { id: "a8", label: "shap_top_features.json", description: "Nhánh thủ công 0.8% tổng mean |SHAP|, nhánh embedding 99.2%", kind: "metric", meta: "Sec. V, S3" },
                { id: "a9", label: "edge_profile.json", description: "2.232M tham số, 8.75 MB, 8.291 ms CPU, 3292.7 ảnh/s GPU batch 32, 1571.7 MB RAM đỉnh", kind: "metric", meta: "Sec. IV.E" },
                { id: "a10", label: "dataset_citation.json", description: "DOI, CC BY 4.0, version_used = 3, SHA-256, đối chiếu số ảnh với bài Data in Brief", kind: "dataset", meta: "Sec. III.A" },
              ]}
            />

            <ReferencePanel
              title="Trích dẫn bắt buộc"
              columns={2}
              items={[
                { id: "c1", label: "Bộ dữ liệu (Mendeley Data)", description: "Nguyen Thanh Truong, Nguyen Xuan Linh, Cap Pham Dinh Thang, Le Tuong. A Durian Leaf Image Dataset of Common Diseases in Vietnam for Agricultural Diagnosis.", kind: "dataset", source: "Mendeley Data", href: "https://doi.org/10.17632/pxzvksbwnj.4", meta: "CC BY 4.0 · version 4 landing, version 3 dùng thật" },
                { id: "c2", label: "Bài mô tả dữ liệu", description: "Nguyen Thanh Truong et al. A durian leaf image dataset of common diseases in Vietnam for agricultural diagnosis. Data in Brief, vol. 61, article 111845, 2025.", kind: "paper", source: "Data in Brief", href: "https://doi.org/10.1016/j.dib.2025.111845", meta: "Trích RIÊNG với DOI bản ghi" },
                { id: "c3", label: "Bộ dữ liệu ngoài miền", description: "cthng123. Durian Leaf Disease Dataset. Chỉ dùng để tái lập Table 5.", kind: "dataset", source: "Kaggle", href: "https://www.kaggle.com/datasets/cthng123/durian-leaf-disease-dataset", meta: "890 ảnh test, dùng 707" },
                { id: "c4", label: "Bài báo này", description: "Ta Chi Hieu, Vu Thi Thanh Nhai. Cost-Aware Durian Leaf Disease Classification for Vietnamese Orchards: A Frozen-Backbone Pipeline with Statistical Validation.", kind: "paper", source: "FAIR 2026, Thuy Loi University", meta: "hieutc@tlu.edu.vn · nhaivu.2004@gmail.com" },
              ]}
            />

            <Callout tone="warning" title="Hai điều cần lưu ý về trạng thái project">
              <Stack gap="inline">
                <Text size="small">
                  (1) Gói tái lập <Code>fair2026-durian-repro</Code> đang có ba file bị xoá trong working
                  tree theo git status: <Code>data/labels.csv</Code> và hai file split CSV. Nếu định gửi
                  gói này cho reviewer hoặc người khác tái lập thì cần khôi phục hoặc ghi chú rõ.
                </Text>
                <Text size="small">
                  (2) Gói <Code>results/</Code> trong repro chỉ kèm 8 artefact chính. Các file
                  hybrid_metrics, dataset_citation, error_analysis, shap_top_features, edge_profile và
                  các biến thể weighted/focal/augmented nằm ở <Code>results/durian/mendeley_pxzvksbwnj/</Code>
                  của project gốc. Muốn chứng minh số nào thì mở đúng thư mục đó.
                </Text>
              </Stack>
            </Callout>

            <Divider />
            <Row gap="inline" wrap align="center">
              <SendToChatButton
                variant="primary"
                label="Hỏi thầy về một chỗ em chưa hiểu"
                prompt="Thầy ơi, em đang đọc paper FAIR 2026 (durian leaf) và chưa hiểu chỗ này: "
              />
              <Text size="small" tone="tertiary">
                Tài liệu tự học · dựng từ bản thảo, supplementary và artefact trong project · mọi số
                đều trace về file JSON/CSV, không nhập tay.
              </Text>
            </Row>
          </Stack>
        </ReportSection>
      </Stack>
    </ReportShell>
  );
}
