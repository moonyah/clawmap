import type { CreateStoreSubmissionInput } from "@/types/submission";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 40;
const ADDRESS_MIN_LENGTH = 5;
const ADDRESS_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
const MAX_SUBMISSION_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadSubmissionImages(localUris: string[]) {
  const uploadedUrls: string[] = [];

  for (const localUri of localUris) {
    const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const filePath = `submission-images/${fileName}`;

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = decode(base64);

    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "heic" || ext === "heif"
            ? "image/heic"
            : "application/octet-stream";

    const { error: uploadError } = await supabase.storage
      .from("store-submissions")
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("store-submissions")
      .getPublicUrl(filePath);

    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}

export async function createStoreSubmission(input: CreateStoreSubmissionInput) {
  const { error } = await supabase.from("store_submissions").insert({
    request_type: input.request_type,
    name: input.name,
    address: input.address,
    description: input.description ?? null,
    image_urls: input.image_urls ?? null,
  });

  if (error) {
    throw error;
  }
}

type RequestType = "add" | "update" | "delete";

const REQUEST_TYPE_OPTIONS: {
  key: RequestType;
  label: string;
  helper: string;
}[] = [
  {
    key: "add",
    label: "매장 추가 요청",
    helper: "지도에 없는 매장을 추가하고 싶어요",
  },
  {
    key: "update",
    label: "매장 수정 요청",
    helper: "주소/이름/정보가 달라요",
  },
  {
    key: "delete",
    label: "매장 삭제 요청",
    helper: "폐업했거나 잘못 등록된 매장이에요",
  },
];

export default function SubmitStoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [requestType, setRequestType] = useState<RequestType>("add");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedHelper = useMemo(() => {
    return (
      REQUEST_TYPE_OPTIONS.find((option) => option.key === requestType)
        ?.helper ?? ""
    );
  }, [requestType]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/mypage");
    }
  };

  const handlePickImages = async () => {
    if (images.length >= 3) {
      Alert.alert("사진 제한", "사진은 최대 3장까지 첨부할 수 있어요.");
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("권한 필요", "사진을 추가하려면 사진 접근 권한이 필요해요.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 3 - images.length,
    });

    if (result.canceled) return;

    const oversizedAsset = result.assets.find(
      (asset) =>
        typeof asset.fileSize === "number" &&
        asset.fileSize > MAX_SUBMISSION_IMAGE_SIZE,
    );

    if (oversizedAsset) {
      Alert.alert("파일 제한", "사진은 1장당 5MB 이하만 업로드할 수 있어요.");
      return;
    }

    const selectedUris = result.assets.map((asset) => asset.uri);
    const nextImages = [...images, ...selectedUris].slice(0, 3);

    setImages(nextImages);
  };

  const handleRemoveImage = (targetUri: string) => {
    setImages((prev) => prev.filter((uri) => uri !== targetUri));
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName || !trimmedAddress) {
      Alert.alert("입력 필요", "매장 이름과 주소를 입력해주세요.");
      return;
    }

    if (trimmedName.length < NAME_MIN_LENGTH) {
      Alert.alert(
        "입력 확인",
        `매장 이름은 ${NAME_MIN_LENGTH}자 이상 입력해주세요.`,
      );
      return;
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      Alert.alert(
        "입력 확인",
        `매장 이름은 ${NAME_MAX_LENGTH}자 이하로 입력해주세요.`,
      );
      return;
    }

    if (trimmedAddress.length < ADDRESS_MIN_LENGTH) {
      Alert.alert(
        "입력 확인",
        `주소는 ${ADDRESS_MIN_LENGTH}자 이상 입력해주세요.`,
      );
      return;
    }

    if (trimmedAddress.length > ADDRESS_MAX_LENGTH) {
      Alert.alert(
        "입력 확인",
        `주소는 ${ADDRESS_MAX_LENGTH}자 이하로 입력해주세요.`,
      );
      return;
    }

    if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      Alert.alert(
        "입력 확인",
        `설명은 ${DESCRIPTION_MAX_LENGTH}자 이하로 입력해주세요.`,
      );
      return;
    }

    try {
      setSubmitting(true);

      const uploadedImageUrls = images.length
        ? await uploadSubmissionImages(images)
        : [];

      await createStoreSubmission({
        request_type: requestType,
        name: trimmedName,
        address: trimmedAddress,
        description: trimmedDescription || null,
        image_urls: uploadedImageUrls.length ? uploadedImageUrls : null,
      });

      Alert.alert("제보 완료", "매장 제보가 접수되었습니다.", [
        {
          text: "확인",
          onPress: handleGoBack,
        },
      ]);
    } catch (error) {
      console.log("STORE SUBMISSION ERROR:", error);
      Alert.alert("등록 실패", "다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "매장 제보",
          gestureEnabled: true,
          headerLeft: () => (
            <Pressable onPress={handleGoBack} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color="#111111" />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom + 32, 80) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
              <Text style={styles.title}>매장 제보</Text>
              <Text style={styles.description}>
                정확한 매장 정보와 사진을 보내주시면 확인 후 반영할게요.
              </Text>

              <Text style={styles.label}>요청 유형</Text>
              <View style={styles.requestTypeWrap}>
                {REQUEST_TYPE_OPTIONS.map((option) => {
                  const selected = requestType === option.key;

                  return (
                    <Pressable
                      key={option.key}
                      style={[
                        styles.requestTypeButton,
                        selected && styles.requestTypeButtonSelected,
                      ]}
                      onPress={() => setRequestType(option.key)}
                    >
                      <Text
                        style={[
                          styles.requestTypeButtonText,
                          selected && styles.requestTypeButtonTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.helperBox}>
                <Text style={styles.helperText}>{selectedHelper}</Text>
              </View>

              <Text style={styles.label}>매장 이름</Text>
              <TextInput
                placeholder="예: 퍼니랜드 홍대점"
                placeholderTextColor="#AAAAAA"
                style={styles.input}
                value={name}
                onChangeText={setName}
                maxLength={NAME_MAX_LENGTH}
              />
              <Text style={styles.lengthText}>
                {name.trim().length}/{NAME_MAX_LENGTH}
              </Text>

              <Text style={styles.label}>주소</Text>
              <TextInput
                placeholder="예: 서울 마포구 ..."
                placeholderTextColor="#AAAAAA"
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                maxLength={ADDRESS_MAX_LENGTH}
              />
              <Text style={styles.lengthText}>
                {address.trim().length}/{ADDRESS_MAX_LENGTH}
              </Text>

              <Text style={styles.label}>설명</Text>
              <TextInput
                placeholder="주소/이름 변경 내용, 폐업 여부, 참고할 내용을 적어주세요. (선택)"
                placeholderTextColor="#AAAAAA"
                style={styles.textarea}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                maxLength={DESCRIPTION_MAX_LENGTH}
              />
              <Text style={styles.lengthText}>
                {description.trim().length}/{DESCRIPTION_MAX_LENGTH}
              </Text>

              <View style={styles.imageSectionHeader}>
                <Text style={styles.label}>사진</Text>
                <Text style={styles.imageCountText}>{images.length}/3</Text>
              </View>

              <Text style={styles.imageGuide}>
                사진이 있으면 더 빠르게 확인할 수 있어요. (최대 3장)
              </Text>

              <Pressable
                style={styles.imageAddButton}
                onPress={handlePickImages}
              >
                <Ionicons name="image-outline" size={20} color="#FF5A5F" />
                <Text style={styles.imageAddButtonText}>사진 추가하기</Text>
              </Pressable>

              {images.length > 0 && (
                <View style={styles.previewList}>
                  {images.map((uri) => (
                    <View key={uri} style={styles.previewItem}>
                      <Image source={{ uri }} style={styles.previewImage} />
                      <Pressable
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(uri)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={22}
                          color="#111111"
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "제보 보내는 중..." : "제보 보내기"}
                </Text>
              </Pressable>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    lineHeight: 21,
    color: "#666666",
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 10,
  },

  requestTypeWrap: {
    gap: 10,
    marginBottom: 12,
  },

  requestTypeButton: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  requestTypeButtonSelected: {
    borderColor: "#FF5A5F",
    backgroundColor: "#FFF1F1",
  },

  requestTypeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
  },

  requestTypeButtonTextSelected: {
    color: "#FF5A5F",
  },

  helperBox: {
    backgroundColor: "#FFF7F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },

  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#666666",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: "#111111",
    backgroundColor: "#FAFAFA",
    marginBottom: 18,
  },

  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: "#111111",
    backgroundColor: "#FAFAFA",
    marginBottom: 20,
  },

  imageSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  imageCountText: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "600",
  },

  imageGuide: {
    fontSize: 13,
    color: "#666666",
    marginBottom: 12,
  },

  imageAddButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFD7D8",
    backgroundColor: "#FFF8F8",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },

  imageAddButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF5A5F",
  },

  previewList: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
  },

  previewItem: {
    position: "relative",
  },

  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: "#F2F2F2",
  },

  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
  },

  button: {
    marginTop: 24,
    backgroundColor: "#FF5A5F",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  lengthText: {
    marginTop: 6,
    marginBottom: 4,
    fontSize: 12,
    color: "#999999",
    textAlign: "right",
  },
});
