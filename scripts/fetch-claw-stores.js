// scripts/fetch-claw-stores.js
// Node.js 18+
// 실행:
// GOOGLE_PLACES_API_KEY=여기에키 node scripts/fetch-claw-stores.js
//
// 결과물:
// output/claw-stores-raw.json
// output/claw-stores.json
// output/claw-stores-review.csv

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  console.error("❌ GOOGLE_PLACES_API_KEY 환경변수가 없습니다.");
  process.exit(1);
}

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const REGIONS = [
  {
    label: "홍대",
    center: { latitude: 37.5563, longitude: 126.922 },
    radius: 1800,
    queries: [
      "홍대 인형뽑기",
      "홍대 뽑기방",
      "홍대 크레인게임",
      "홍대 오락실 인형뽑기",
    ],
  },
  {
    label: "신촌",
    center: { latitude: 37.5551, longitude: 126.9368 },
    radius: 1500,
    queries: [
      "신촌 인형뽑기",
      "신촌 뽑기방",
      "신촌 크레인게임",
      "신촌 오락실 인형뽑기",
    ],
  },
  {
    label: "건대",
    center: { latitude: 37.54, longitude: 127.0693 },
    radius: 1500,
    queries: [
      "건대 인형뽑기",
      "건대 뽑기방",
      "건대 크레인게임",
      "건대 오락실 인형뽑기",
    ],
  },
  {
    label: "강남",
    center: { latitude: 37.4979, longitude: 127.0276 },
    radius: 2000,
    queries: [
      "강남 인형뽑기",
      "강남 뽑기방",
      "강남 크레인게임",
      "강남 오락실 인형뽑기",
    ],
  },
  {
    label: "대학로",
    center: { latitude: 37.582, longitude: 127.0018 },
    radius: 1500,
    queries: [
      "대학로 인형뽑기",
      "혜화 인형뽑기",
      "혜화 뽑기방",
      "혜화 크레인게임",
    ],
  },
  {
    label: "합정",
    center: { latitude: 37.5509, longitude: 126.9137 },
    radius: 1400,
    queries: ["합정 인형뽑기", "합정 뽑기방", "합정 크레인게임"],
  },
  {
    label: "잠실",
    center: { latitude: 37.5133, longitude: 127.1 },
    radius: 1800,
    queries: ["잠실 인형뽑기", "잠실 뽑기방", "잠실 크레인게임"],
  },
  {
    label: "명동",
    center: { latitude: 37.5636, longitude: 126.9827 },
    radius: 1500,
    queries: ["명동 인형뽑기", "명동 뽑기방", "명동 크레인게임"],
  },
];

// 비용 절약 + 판별용 필드만 요청
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.businessStatus",
  "places.types",
  "places.primaryType",
  "nextPageToken",
].join(",");

// 강한 긍정 신호
const STRONG_ALLOW_KEYWORDS = [
  "인형뽑기",
  "뽑기방",
  "크레인",
  "크레인게임",
  "claw",
  "ufo catcher",
  "ufocatcher",
];

// 약한 긍정 신호
const WEAK_ALLOW_KEYWORDS = [
  "오락실",
  "아케이드",
  "arcade",
  "amusement",
  "game center",
  "게임센터",
  "게임장",
];

// 제외 신호
const REJECT_KEYWORDS = [
  "코인노래방",
  "노래방",
  "pc방",
  "피시방",
  "볼링",
  "당구",
  "포켓볼",
  "키즈카페",
  "방탈출",
  "이스케이프",
  "뮤지엄",
  "전시",
  "공원",
  "놀이터",
  "테마파크",
  "놀이공원",
  "롯데월드",
  "사진관",
  "인생네컷",
  "카페",
  "보드게임",
  "스크린골프",
];
// Google types는 가끔 애매하지만 참고 지표로 사용
const ALLOW_TYPES = ["amusement_center", "video_arcade"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeName(name = "") {
  return name.replace(/\s+/g, " ").replace(/[()]/g, "").trim().toLowerCase();
}

function normalizeText(text = "") {
  return String(text).trim().toLowerCase();
}

function includesAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function mapBusinessStatus(status) {
  if (status === "OPERATIONAL") return "운영중";
  if (status === "CLOSED_TEMPORARILY") return "임시휴업";
  if (status === "CLOSED_PERMANENTLY") return "폐업";
  return "운영중";
}

function getPlaceText(place) {
  const name = normalizeText(place.displayName?.text ?? "");
  const addr = normalizeText(place.formattedAddress ?? "");
  const primaryType = normalizeText(place.primaryType ?? "");
  const types = Array.isArray(place.types)
    ? place.types.map((t) => normalizeText(t)).join(" ")
    : "";

  return {
    name,
    addr,
    primaryType,
    types,
    merged: `${name} ${addr} ${primaryType} ${types}`.trim(),
  };
}

function evaluateRelevance(place) {
  const { name, addr, primaryType, types, merged } = getPlaceText(place);

  const hasStrongAllow = includesAny(merged, STRONG_ALLOW_KEYWORDS);
  const hasWeakAllow = includesAny(merged, WEAK_ALLOW_KEYWORDS);
  const hasReject = includesAny(merged, REJECT_KEYWORDS);
  const hasAllowedType =
    ALLOW_TYPES.includes(primaryType) ||
    ALLOW_TYPES.some((t) => types.includes(t));

  // 명확히 제외
  if (hasReject && !hasStrongAllow) {
    return {
      keep: false,
      score: 0,
      reason: "reject_keyword",
      needs_review: false,
    };
  }

  // 강한 긍정 신호가 있으면 통과
  if (hasStrongAllow) {
    return {
      keep: true,
      score: 3,
      reason: "strong_keyword",
      needs_review: false,
    };
  }

  // 타입 + 약한 신호면 후보군으로 통과하되 검수 필요
  if (hasAllowedType && hasWeakAllow) {
    return {
      keep: true,
      score: 2,
      reason: "allowed_type_and_weak_keyword",
      needs_review: true,
    };
  }

  // 타입만 있어도 일단 후보로 남기고 검수
  if (hasAllowedType) {
    return {
      keep: true,
      score: 1,
      reason: "allowed_type_only",
      needs_review: true,
    };
  }

  // 약한 신호만 있으면 너무 불안정해서 검수 후보로만 남김
  if (hasWeakAllow && !hasReject) {
    return {
      keep: true,
      score: 1,
      reason: "weak_keyword_only",
      needs_review: true,
    };
  }

  return {
    keep: false,
    score: 0,
    reason: "irrelevant",
    needs_review: false,
  };
}

async function searchText(region, query) {
  let allPlaces = [];
  let pageToken = null;
  let page = 1;

  while (true) {
    const body = {
      textQuery: query,
      languageCode: "ko",
      regionCode: "KR",
      pageSize: 20,
      locationBias: {
        circle: {
          center: region.center,
          radius: region.radius,
        },
      },
    };

    if (pageToken) {
      body.pageToken = pageToken;
    }

    const res = await fetch(SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `[${region.label} / ${query}] API 호출 실패 (${res.status})\n${errorText}`,
      );
    }

    const data = await res.json();
    const places = data.places ?? [];

    console.log(
      `✅ [${region.label}] "${query}" page ${page}: ${places.length}개`,
    );

    allPlaces.push(...places);

    if (!data.nextPageToken) break;

    pageToken = data.nextPageToken;
    page += 1;

    // nextPageToken 안정화 대기
    await sleep(2000);
  }

  return allPlaces;
}

async function collectAll() {
  const rawResults = [];

  for (const region of REGIONS) {
    for (const query of region.queries) {
      const places = await searchText(region, query);

      rawResults.push({
        region: region.label,
        query,
        places,
      });

      // 과호출 방지
      await sleep(500);
    }
  }

  return rawResults;
}

function transformAndDedupe(rawResults) {
  const map = new Map();

  for (const item of rawResults) {
    const { region, query, places } = item;

    for (const place of places) {
      if (
        place.location?.latitude == null ||
        place.location?.longitude == null
      ) {
        continue;
      }

      if (!place.displayName?.text || !place.formattedAddress) {
        continue;
      }

      const relevance = evaluateRelevance(place);
      if (!relevance.keep) continue;

      const row = {
        name: place.displayName.text.trim(),
        address: place.formattedAddress.trim(),
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        status: mapBusinessStatus(place.businessStatus),
        source_region: region,
        source_query: query,
        place_id: place.id ?? "",
        primary_type: place.primaryType ?? "",
        types: place.types ?? [],
        relevance_score: relevance.score,
        relevance_reason: relevance.reason,
        needs_review: relevance.needs_review,
        is_verified: false,
        image_url: null,
        description: null,
      };

      const key =
        row.place_id ||
        `${normalizeName(row.name)}__${normalizeText(row.address)}`;

      if (!map.has(key)) {
        map.set(key, row);
        continue;
      }

      // 이미 있으면 더 점수 높은 쪽 채택
      const existing = map.get(key);

      if (row.relevance_score > existing.relevance_score) {
        map.set(key, row);
        continue;
      }

      // 점수 같으면 review false 우선
      if (
        row.relevance_score === existing.relevance_score &&
        existing.needs_review &&
        !row.needs_review
      ) {
        map.set(key, row);
      }
    }
  }

  return Array.from(map.values());
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.needs_review !== b.needs_review) {
      return a.needs_review ? 1 : -1;
    }

    if (a.source_region !== b.source_region) {
      return a.source_region.localeCompare(b.source_region, "ko");
    }

    return a.name.localeCompare(b.name, "ko");
  });
}

function toCsv(rows) {
  const headers = [
    "name",
    "address",
    "latitude",
    "longitude",
    "status",
    "source_region",
    "source_query",
    "place_id",
    "primary_type",
    "types",
    "relevance_score",
    "relevance_reason",
    "needs_review",
    "is_verified",
  ];

  const escape = (value) => {
    const str = String(value ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.address,
        row.latitude,
        row.longitude,
        row.status,
        row.source_region,
        row.source_query,
        row.place_id,
        row.primary_type,
        Array.isArray(row.types) ? row.types.join("|") : "",
        row.relevance_score,
        row.relevance_reason,
        row.needs_review,
        row.is_verified,
      ]
        .map(escape)
        .join(","),
    ),
  ];

  return lines.join("\n");
}

function toSupabaseRows(rows) {
  return rows.map((row) => ({
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    image_url: null,
    description: null,
  }));
}

function printSummary(rows) {
  const total = rows.length;
  const reviewCount = rows.filter((r) => r.needs_review).length;
  const verifiedReadyCount = rows.filter((r) => !r.needs_review).length;

  const byRegion = rows.reduce((acc, row) => {
    acc[row.source_region] = (acc[row.source_region] || 0) + 1;
    return acc;
  }, {});

  console.log("\n🎯 최종 결과");
  console.log(`- 전체: ${total}개`);
  console.log(`- 바로 사용 가능(상대적): ${verifiedReadyCount}개`);
  console.log(`- 검수 필요: ${reviewCount}개`);

  console.log("\n📍 지역별 개수");
  console.table(byRegion);
}

async function main() {
  try {
    console.log("🚀 ClawMap 매장 수집 시작");

    const rawResults = await collectAll();
    const deduped = transformAndDedupe(rawResults);
    const sorted = sortRows(deduped);

    const outputDir = path.join(process.cwd(), "output");
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, "claw-stores-raw.json"),
      JSON.stringify(sorted, null, 2),
      "utf-8",
    );

    fs.writeFileSync(
      path.join(outputDir, "claw-stores.json"),
      JSON.stringify(toSupabaseRows(sorted), null, 2),
      "utf-8",
    );

    fs.writeFileSync(
      path.join(outputDir, "claw-stores-review.csv"),
      toCsv(sorted),
      "utf-8",
    );

    printSummary(sorted);

    console.log("\n💾 저장 완료");
    console.log("- output/claw-stores-raw.json");
    console.log("- output/claw-stores.json");
    console.log("- output/claw-stores-review.csv");

    console.log("\n샘플 10개:");
    console.table(
      sorted.slice(0, 10).map((row) => ({
        name: row.name,
        region: row.source_region,
        reason: row.relevance_reason,
        needs_review: row.needs_review,
        status: row.status,
      })),
    );
  } catch (error) {
    console.error("❌ 에러 발생");
    console.error(error);
    process.exit(1);
  }
}

main();
