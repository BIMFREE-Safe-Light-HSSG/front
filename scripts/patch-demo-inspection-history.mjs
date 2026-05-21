import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, "../lib/facility-demo/scene-graph-skeleton.json");

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

data.scene_graph.inspection_history = [
  {
    id: "building-insp-1",
    date: "2026-04-18",
    action: "월간 안전 점검",
    result: "경미 이슈 2건 — 후속 조치 예정",
    inspector: "김시설",
  },
  {
    id: "building-insp-2",
    date: "2026-01-09",
    action: "소방 설비 종합 점검",
    result: "법정 기준 충족",
    inspector: "박안전",
  },
  {
    id: "building-insp-3",
    date: "2025-10-22",
    action: "전기·배관 설비 점검",
    result: "이상 없음",
    inspector: "이전기",
  },
];

const assetHistories = {
  ASSET_EXT_01: [
    {
      id: "ASSET_EXT_01-insp-1",
      date: "2026-03-14",
      action: "소화기 압력·봉인 점검",
      result: "정상",
      inspector: "현장 점검팀",
    },
    {
      id: "ASSET_EXT_01-insp-2",
      date: "2025-11-12",
      action: "정기 점검",
      result: "이상 없음",
      inspector: "김시설",
    },
  ],
  STRUCT_DOOR_01: [
    {
      id: "STRUCT_DOOR_01-insp-1",
      date: "2026-02-20",
      action: "방화문 폐쇄·힌지 점검",
      result: "이상 없음",
      inspector: "박안전",
    },
  ],
  STRUCT_WINDOW_01: [
    {
      id: "STRUCT_WINDOW_01-insp-1",
      date: "2026-01-15",
      action: "창호 기밀·잠금 점검",
      result: "경미한 틈새 — 실리콘 보수 예정",
      inspector: "이전기",
    },
  ],
  ASSET_EXT_02: [
    {
      id: "ASSET_EXT_02-insp-1",
      date: "2026-04-02",
      action: "유효기간 확인",
      result: "교체 예정 (30일 이내)",
      inspector: "현장 점검팀",
    },
    {
      id: "ASSET_EXT_02-insp-2",
      date: "2025-09-08",
      action: "정기 점검",
      result: "이상 없음",
      inspector: "김시설",
    },
  ],
  ASSET_SEN_01: [
    {
      id: "ASSET_SEN_01-insp-1",
      date: "2026-03-28",
      action: "온도 센서 교정",
      result: "허용 오차 내",
      inspector: "이전기",
    },
  ],
  ASSET_CAM_01: [
    {
      id: "ASSET_CAM_01-insp-1",
      date: "2026-02-11",
      action: "CCTV 녹화·화각 점검",
      result: "이상 없음",
      inspector: "현장 점검팀",
    },
  ],
  ASSET_EXIT_01: [
    {
      id: "ASSET_EXIT_01-insp-1",
      date: "2026-04-10",
      action: "비상구 개폐·표지 점검",
      result: "잠금 장치 고장 — 수리 요청",
      inspector: "박안전",
    },
    {
      id: "ASSET_EXIT_01-insp-2",
      date: "2026-01-22",
      action: "피난 동선 점검",
      result: "장애물 없음",
      inspector: "김시설",
    },
  ],
  ASSET_LIGHT_01: [
    {
      id: "ASSET_LIGHT_01-insp-1",
      date: "2026-03-05",
      action: "비상 조명 배터리 점검",
      result: "방전 — 교체 완료",
      inspector: "이전기",
    },
  ],
  ASSET_EXT_001: [
    {
      id: "ASSET_EXT_001-insp-1",
      date: "2025-12-18",
      action: "정기 점검",
      result: "이상 없음",
      inspector: "현장 점검팀",
    },
  ],
};

function applyToAsset(asset) {
  const history = assetHistories[asset.id];
  if (history) {
    asset.inspection_history = history;
  }
}

for (const node of data.scene_graph.nodes ?? []) {
  for (const asset of node.assets ?? []) {
    applyToAsset(asset);
  }
}

for (const asset of data.scene_graph.assets ?? []) {
  applyToAsset(asset);
}

fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log("Patched inspection_history in", jsonPath);
