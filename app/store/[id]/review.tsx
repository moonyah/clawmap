import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import {
  DIFFICULTY_OPTIONS,
  MACHINE_OPTIONS,
  RECOMMEND_OPTIONS,
  STOCK_OPTIONS,
} from "@/constants/reviewOptions";
import { createReview, uploadReviewImage } from "@/lib/api/reviews";
import { getStoreById } from "@/lib/api/stores";
import type { ReviewRecommend } from "@/types/review";
import type { Store } from "@/types/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 12;
const COMMENT_MIN_LENGTH = 5;
const COMMENT_MAX_LENGTH = 300;
const MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ReviewWriteScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [nickname, setNickname] = useState("");
  const [comment, setComment] = useState("");
  const [machineCondition, setMachineCondition] = useState<
    "좋음" | "보통" | "나쁨"
  >("보통");
  const [prizeStock, setPrizeStock] = useState<"많음" | "보통" | "적음">(
    "보통",
  );
  const [difficulty, setDifficulty] = useState<"쉬움" | "보통" | "어려움">(
    "보통",
  );
  const [recommend, setRecommend] = useState<ReviewRecommend>("애매");

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStore() {
      if (!id) {
        setStore(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getStoreById(id);
        setStore(data);
      } catch (error) {
        console.log("GET STORE ERROR:", error);
        setStore(null);
      } finally {
        setLoading(false);
      }
    }

    fetchStore();
  }, [id]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("권한 필요", "사진 첨부를 위해 앨범 접근 권한이 필요합니다.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.7,
    });

    if (result.canceled) return;

    const selectedAsset = result.assets[0];

    if (
      typeof selectedAsset.fileSize === "number" &&
      selectedAsset.fileSize > MAX_REVIEW_IMAGE_SIZE
    ) {
      Alert.alert("파일 제한", "사진은 5MB 이하만 업로드할 수 있어요.");
      return;
    }

    setSelectedImageUri(selectedAsset.uri);
  };

  const submitReview = async () => {
    if (!store) return;

    try {
      setSubmitting(true);

      let imageUrl: string | null = null;

      if (selectedImageUri) {
        setUploadingImage(true);
        imageUrl = await uploadReviewImage(store.id, selectedImageUri);
        setUploadingImage(false);
      }

      await createReview({
        store_id: store.id,
        nickname: nickname.trim(),
        comment: comment.trim(),
        machine_condition: machineCondition,
        prize_stock: prizeStock,
        difficulty,
        recommend,
        image_url: imageUrl,
      });

      Alert.alert("후기 등록 완료", "후기가 등록되었습니다.", [
        {
          text: "확인",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("CREATE REVIEW ERROR:", error);
      Alert.alert("등록 실패", "후기 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    Keyboard.dismiss();

    const trimmedNickname = nickname.trim();
    const trimmedComment = comment.trim();

    if (!trimmedNickname) {
      Alert.alert("입력 확인", "닉네임을 입력해주세요.");
      return;
    }

    if (trimmedNickname.length < NICKNAME_MIN_LENGTH) {
      Alert.alert(
        "입력 확인",
        `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 입력해주세요.`,
      );
      return;
    }

    if (trimmedNickname.length > NICKNAME_MAX_LENGTH) {
      Alert.alert(
        "입력 확인",
        `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`,
      );
      return;
    }

    if (!trimmedComment) {
      Alert.alert("입력 확인", "한줄 후기를 입력해주세요.");
      return;
    }

    if (trimmedComment.length < COMMENT_MIN_LENGTH) {
      Alert.alert(
        "입력 확인",
        `한줄 후기는 ${COMMENT_MIN_LENGTH}자 이상 입력해주세요.`,
      );
      return;
    }

    if (trimmedComment.length > COMMENT_MAX_LENGTH) {
      Alert.alert(
        "입력 확인",
        `한줄 후기는 ${COMMENT_MAX_LENGTH}자 이하로 입력해주세요.`,
      );
      return;
    }

    Alert.alert("후기 등록", "후기를 등록하시겠습니까?", [
      {
        text: "취소",
        style: "cancel",
      },
      {
        text: "등록",
        onPress: submitReview,
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#111111" />
        <Text style={styles.loadingText}>매장 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.center}>
        <Text>매장을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "후기 작성",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + 32, 80) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeAddress}>{store.address}</Text>

          <Text style={styles.label}>닉네임</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임을 입력하세요"
            style={styles.input}
            placeholderTextColor="#999999"
            maxLength={NICKNAME_MAX_LENGTH}
          />
          <Text style={styles.helperText}>
            {nickname.trim().length}/{NICKNAME_MAX_LENGTH}
          </Text>

          <Text style={styles.label}>한줄 후기</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="매장 분위기나 뽑기 느낌을 적어보세요."
            style={[styles.input, styles.textArea]}
            placeholderTextColor="#999999"
            multiline
            textAlignVertical="top"
            maxLength={COMMENT_MAX_LENGTH}
          />
          <Text style={styles.helperText}>
            {comment.trim().length}/{COMMENT_MAX_LENGTH}
          </Text>
          <Text style={styles.label}>기계 상태</Text>
          <View style={styles.optionRow}>
            {MACHINE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.optionButton,
                  machineCondition === option && styles.optionButtonActive,
                ]}
                onPress={() => setMachineCondition(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    machineCondition === option && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>상품 채움 상태</Text>
          <View style={styles.optionRow}>
            {STOCK_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.optionButton,
                  prizeStock === option && styles.optionButtonActive,
                ]}
                onPress={() => setPrizeStock(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    prizeStock === option && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>난이도 체감</Text>
          <View style={styles.optionRow}>
            {DIFFICULTY_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.optionButton,
                  difficulty === option && styles.optionButtonActive,
                ]}
                onPress={() => setDifficulty(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    difficulty === option && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>추천 여부</Text>
          <View style={styles.optionRow}>
            {RECOMMEND_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.optionButton,
                  recommend === option && styles.optionButtonActive,
                ]}
                onPress={() => setRecommend(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    recommend === option && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>사진</Text>
          <Pressable style={styles.photoButton} onPress={handlePickImage}>
            <Text style={styles.photoButtonText}>
              {selectedImageUri ? "사진 다시 선택하기" : "사진 선택하기"}
            </Text>
          </Pressable>
          <Text style={styles.helperText}>
            사진은 5MB 이하 1장까지 첨부할 수 있어요.
          </Text>

          {selectedImageUri && (
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.previewImage}
            />
          )}

          <Pressable
            style={[
              styles.submitButton,
              (submitting || uploadingImage) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || uploadingImage}
          >
            <Text style={styles.submitButtonText}>
              {uploadingImage
                ? "사진 업로드 중..."
                : submitting
                  ? "등록 중..."
                  : "등록하기"}
            </Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666666",
  },
  storeName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 6,
  },
  storeAddress: {
    fontSize: 14,
    color: "#777777",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: "#111111",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  textArea: {
    minHeight: 120,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  optionButtonActive: {
    backgroundColor: "#FFECEC",
    borderColor: "#FFB8BE",
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
  },
  optionTextActive: {
    color: "#FF5A5F",
  },
  photoButton: {
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  photoButtonText: {
    fontSize: 14,
    color: "#777777",
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: "#111111",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 28,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  helperText: {
    marginTop: 6,
    marginBottom: 4,
    fontSize: 12,
    color: "#999999",
    textAlign: "right",
  },
});
