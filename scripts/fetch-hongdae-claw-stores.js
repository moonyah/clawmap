// scripts/fetch-hongdae-claw-stores.js
// Node.js 18+
// 실행:
// GOOGLE_PLACES_API_KEY=실제키 node scripts/fetch-hongdae-claw-stores.js

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  console.error("❌ GOOGLE_PLACES_API_KEY 환경변수가 없습니다.");
  process.exit(1);
}

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const HONGDAE = {
  label: "홍대",
  center: { latitude: 37.5563, longitude: 126.922 },
  radius: 1800,
  queries: [
    "홍대 인형뽑기",
    "홍대 뽑기방",
    "홍대 크레인게임",
    "홍대 오락실 인형뽑기",
  ],
};

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

const STRONG_ALLOW_KEYWORDS = [
  "인형뽑기",
  "뽑기방",
  "크레인",
  "크레인게임",
  "claw",
];

const REJECT_KEYWORDS = [
  "코인노래방",
  "노래방",
  "pc방",
  "피시방",
  "볼링",
  "당구",
  "키즈카페",
  "방탈출",
  "이스케이프",
  "뮤지엄",
  "전시",
  "놀이터",
  "테마파크",
  "놀이공원",
  "롯데월드",
  "인생네컷",
  "사진관",
  "카페",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function isSeoulAddress(address = "") {
  return address.includes("서울");
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isRelevantPlace(place) {
  const name = normalizeText(place.displayName?.text ?? "");
  const address = normalizeText(place.formattedAddress ?? "");
  const primaryType = normalizeText(place.primaryType ?? "");
  const types = Array.isArray(place.types)
    ? place.types.map(normalizeText).join(" ")
    : "";

  const text = `${name} ${address} ${primaryType} ${types}`;

  const hasStrongAllow = includesAny(text, STRONG_ALLOW_KEYWORDS);
  const hasReject = includesAny(text, REJECT_KEYWORDS);

  if (hasReject) return false;
  if (hasStrongAllow) return true;

  return false;
}

async function searchQuery(query) {
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
          center: HONGDAE.center,
          radius: HONGDAE.radius,
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
      throw new Error(`[${query}] API 호출 실패 (${res.status})\n${errorText}`);
    }

    const data = await res.json();
    const places = data.places ?? [];

    console.log(`✅ "${query}" page ${page}: ${places.length}개`);
    allPlaces.push(...places);

    if (!data.nextPageToken) break;

    pageToken = data.nextPageToken;
    page += 1;
    await sleep(2000);
  }

  return allPlaces;
}

function dedupePlaces(rows) {
  const map = new Map();

  for (const row of rows) {
    const key = row.place_id || `${row.name}_${row.address}`;
    if (!map.has(key)) {
      map.set(key, row);
    }
  }

  return Array.from(map.values());
}

function toCsv(rows) {
  const headers = [
    "name",
    "address",
    "latitude",
    "longitude",
    "status",
    "source_query",
    "place_id",
    "primary_type",
    "types",
    "distance_m",
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
        row.source_query,
        row.place_id,
        row.primary_type,
        Array.isArray(row.types) ? row.types.join("|") : "",
        row.distance_m,
      ]
        .map(escape)
        .join(","),
    ),
  ];

  return lines.join("\n");
}

async function main() {
  try {
    console.log("🚀 홍대 인형뽑기 매장 수집 시작");

    let collected = [];

    for (const query of HONGDAE.queries) {
      const places = await searchQuery(query);

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

        const distance = getDistanceMeters(
          HONGDAE.center.latitude,
          HONGDAE.center.longitude,
          place.location.latitude,
          place.location.longitude,
        );

        if (distance > HONGDAE.radius) continue;
        if (!isSeoulAddress(place.formattedAddress)) continue;
        if (!isRelevantPlace(place)) continue;

        collected.push({
          name: place.displayName.text.trim(),
          address: place.formattedAddress.trim(),
          latitude: place.location.latitude,
          longitude: place.location.longitude,
          status: mapBusinessStatus(place.businessStatus),
          source_query: query,
          place_id: place.id ?? "",
          primary_type: place.primaryType ?? "",
          types: place.types ?? [],
          distance_m: Math.round(distance),
        });
      }

      await sleep(500);
    }

    const finalRows = dedupePlaces(collected).sort(
      (a, b) => a.distance_m - b.distance_m,
    );

    const outputDir = path.join(process.cwd(), "output");
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, "hongdae-claw-stores.json"),
      JSON.stringify(finalRows, null, 2),
      "utf-8",
    );

    fs.writeFileSync(
      path.join(outputDir, "hongdae-claw-stores.csv"),
      toCsv(finalRows),
      "utf-8",
    );

    console.log(`\n🎯 최종 결과: ${finalRows.length}개`);
    console.log("- output/hongdae-claw-stores.json");
    console.log("- output/hongdae-claw-stores.csv");

    console.table(
      finalRows.map((row) => ({
        name: row.name,
        distance_m: row.distance_m,
        address: row.address,
      })),
    );
  } catch (error) {
    console.error("❌ 에러 발생");
    console.error(error);
    process.exit(1);
  }
}

main();
