import { reportOptions } from "@/constants/reportReasons";
import { createStoreReport } from "@/lib/api/reports";
import type { StoreReportReason } from "@/types/report";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const DETAIL_MAX_LENGTH = 300;

export default function ReportStoreScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [reason, setReason] = useState<StoreReportReason>("폐업");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!id) {
      Alert.alert("오류", "매장 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      setSubmitting(true);

      await createStoreReport({
        store_id: id,
        reason,
        detail: detail.trim() || null,
      });

      Alert.alert("신고 접수", "신고가 접수되었습니다.", [
        {
          text: "확인",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("STORE REPORT ERROR:", error);
      Alert.alert("신고 실패", "다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "매장 신고",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(insets.bottom + 32, 80) },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>매장 신고</Text>
              <Text style={styles.description}>
                잘못된 매장 정보나 운영 상태를 알려주시면 확인 후 반영할게요.
              </Text>

              <Text style={styles.label}>신고 사유</Text>
              <View style={styles.optionWrap}>
                {reportOptions.map((option) => {
                  const selected = reason === option;

                  return (
                    <Pressable
                      key={option}
                      style={[
                        styles.optionButton,
                        selected && styles.optionButtonActive,
                      ]}
                      onPress={() => setReason(option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>상세 내용</Text>
              <TextInput
                placeholder="추가로 전달할 내용을 입력해주세요. (선택)"
                placeholderTextColor="#AAAAAA"
                style={styles.textarea}
                value={detail}
                onChangeText={setDetail}
                multiline
                textAlignVertical="top"
                maxLength={DETAIL_MAX_LENGTH}
              />
              <Text style={styles.lengthText}>
                {detail.trim().length}/{DETAIL_MAX_LENGTH}
              </Text>

              <Pressable
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "신고 보내는 중..." : "신고 보내기"}
                </Text>
              </Pressable>
            </ScrollView>
          </TouchableWithoutFeedback>
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

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
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
    fontSize: 12,
    color: "#999999",
    textAlign: "right",
  },
});
