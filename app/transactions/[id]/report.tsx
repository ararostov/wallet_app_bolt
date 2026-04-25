// Dispute form — POST /transactions/{id}/report.
// See spec docs/mobile/specs/06-transactions.ru.md §4.3.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ImagePlus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '@/context/ThemeContext';
import { useReportTransaction } from '@/hooks/useReportTransaction';
import type {
  DeclaredAttachment,
  DisputeAttachmentContentType,
  DisputeReason,
} from '@/types/transactions';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { newIdempotencyKey } from '@/utils/idempotency';

interface PickedAttachment {
  filename: string;
  contentType: DisputeAttachmentContentType;
  sizeBytes: number;
  uri: string;
}

const REASON_OPTIONS: readonly {
  value: DisputeReason;
  label: string;
  description: string;
}[] = [
  {
    value: 'unauthorized',
    label: "I didn't make this transaction",
    description: 'Unauthorised use of my wallet.',
  },
  {
    value: 'duplicate',
    label: 'Duplicate charge',
    description: 'I was charged more than once.',
  },
  {
    value: 'wrong_amount',
    label: 'Wrong amount charged',
    description: 'The amount does not match what I agreed.',
  },
  {
    value: 'service_not_received',
    label: 'Service not received',
    description: 'The merchant did not provide the service.',
  },
  {
    value: 'product_defective',
    label: 'Product defective or not as described',
    description: 'Item arrived broken or is not what I ordered.',
  },
  {
    value: 'other',
    label: 'Something else',
    description: 'None of the above — we will review your note.',
  },
];

const MIN_DESC = 20;
const MAX_DESC = 2000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES: readonly DisputeAttachmentContentType[] = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/pdf',
];

function inferContentType(
  filename: string | null | undefined,
  mimeType: string | undefined,
): DisputeAttachmentContentType | null {
  const candidate = (mimeType ?? '').toLowerCase();
  if (
    candidate === 'image/jpeg' ||
    candidate === 'image/png' ||
    candidate === 'image/heic' ||
    candidate === 'application/pdf'
  ) {
    return candidate;
  }
  if (candidate === 'image/jpg') return 'image/jpeg';
  const ext = (filename ?? '').toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'pdf') return 'application/pdf';
  return null;
}

export default function ReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();

  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<PickedAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { mutate, loading } = useReportTransaction();

  // Idempotency-Key per logical operation: rotate when reason or
  // description hash changes so the backend treats genuinely-different
  // submissions as fresh.
  const idemRef = useRef<string>(newIdempotencyKey());
  const lastHashRef = useRef<string>('');
  useEffect(() => {
    const hash = `${reason ?? ''}::${description.trim()}`;
    if (hash !== lastHashRef.current) {
      idemRef.current = newIdempotencyKey();
      lastHashRef.current = hash;
    }
  }, [reason, description]);

  const trimmedLength = description.trim().length;
  const isValid = useMemo(
    () =>
      reason !== null &&
      trimmedLength >= MIN_DESC &&
      description.length <= MAX_DESC &&
      !loading &&
      !submitted,
    [reason, trimmedLength, description.length, loading, submitted],
  );

  const pickPhoto = async () => {
    setAttachmentError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setAttachmentError(
          'Photo library permission denied. Enable it in Settings to attach a photo.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      const filename =
        asset.fileName ?? asset.uri.split('/').pop() ?? 'attachment';
      const contentType = inferContentType(filename, asset.mimeType);
      if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
        setAttachmentError(
          mapErrorCode('DISPUTE_ATTACHMENT_TYPE_NOT_ALLOWED') ??
            'This file type is not supported.',
        );
        return;
      }
      const size = asset.fileSize ?? 0;
      if (size > MAX_ATTACHMENT_BYTES) {
        setAttachmentError(
          mapErrorCode('DISPUTE_ATTACHMENT_TOO_LARGE') ??
            'File exceeds 10 MB.',
        );
        return;
      }
      setAttachment({
        filename,
        contentType,
        sizeBytes: size,
        uri: asset.uri,
      });
    } catch (e) {
      setAttachmentError(e instanceof Error ? e.message : 'Could not pick a photo.');
    }
  };

  const submit = async () => {
    if (!isValid || !reason) return;
    setFieldError(null);
    const declared: DeclaredAttachment[] = attachment
      ? [
          {
            filename: attachment.filename,
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
          },
        ]
      : [];
    try {
      const result = await mutate({
        transactionId: id!,
        idempotencyKey: idemRef.current,
        payload: {
          reason,
          description: description.trim(),
          attachments: declared,
        },
      });
      setSubmitted(true);
      setAttachment(null);
      router.replace(
        `/transactions/${id}/report/submitted?ref=${encodeURIComponent(result.reference)}` as never,
      );
    } catch (e) {
      if (e instanceof ApiError) {
        const friendly = mapErrorCode(e.code);
        if (e.code === 'DISPUTE_ALREADY_OPEN') {
          Alert.alert('Dispute already open', friendly ?? e.message);
          router.replace(`/transactions/${id}` as never);
          return;
        }
        if (e.code === 'TRANSACTION_NOT_DISPUTABLE') {
          Alert.alert(
            'Cannot dispute',
            friendly ?? "This transaction can't be disputed.",
          );
          router.back();
          return;
        }
        if (e.code === 'TRANSACTION_NOT_FOUND' || e.code === 'TRANSACTION_TOO_OLD_FOR_DISPUTE') {
          Alert.alert('Unable to continue', friendly ?? e.message);
          router.back();
          return;
        }
        if (
          e.code === 'DISPUTE_ATTACHMENT_TOO_LARGE' ||
          e.code === 'DISPUTE_ATTACHMENT_TYPE_NOT_ALLOWED' ||
          e.code === 'DISPUTE_ATTACHMENT_LIMIT_EXCEEDED'
        ) {
          setAttachmentError(friendly ?? e.message);
          return;
        }
        setFieldError(friendly ?? e.message);
        return;
      }
      setFieldError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Report an issue</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          What's the issue?
        </Text>
        {REASON_OPTIONS.map((opt) => {
          const active = reason === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.reasonRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                active && {
                  borderColor: colors.primary,
                  backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff',
                },
              ]}
              onPress={() => setReason(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <View
                style={[
                  styles.radio,
                  { borderColor: isDark ? colors.textTertiary : '#cbd5e1' },
                  active && { borderColor: colors.primary },
                ]}
              >
                {active && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reasonText, { color: colors.text }]}>
                  {opt.label}
                </Text>
                <Text style={[styles.reasonHint, { color: colors.textTertiary }]}>
                  {opt.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
          Tell us what happened
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          multiline
          numberOfLines={5}
          maxLength={MAX_DESC}
          placeholder="Describe the issue (at least 20 characters)..."
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />
        <Text
          style={[
            styles.counter,
            {
              color:
                trimmedLength < MIN_DESC || description.length > MAX_DESC
                  ? '#ef4444'
                  : colors.textTertiary,
            },
          ]}
        >
          {trimmedLength < MIN_DESC
            ? `At least ${MIN_DESC} characters (${trimmedLength}/${MIN_DESC})`
            : `${description.length} / ${MAX_DESC}`}
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
          Add a photo (optional)
        </Text>
        {attachment ? (
          <View
            style={[
              styles.attachmentRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.attachmentName, { color: colors.text }]}>
                {attachment.filename}
              </Text>
              <Text style={[styles.attachmentMeta, { color: colors.textTertiary }]}>
                {attachment.contentType} · {(attachment.sizeBytes / 1024).toFixed(0)} KB
              </Text>
            </View>
            <TouchableOpacity onPress={() => setAttachment(null)} hitSlop={10}>
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.attachmentRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={pickPhoto}
          >
            <ImagePlus size={18} color={colors.textTertiary} />
            <Text style={[styles.attachmentMeta, { color: colors.textSecondary, flex: 1 }]}>
              Choose from library
            </Text>
          </TouchableOpacity>
        )}
        {attachmentError && (
          <Text style={styles.errorText}>{attachmentError}</Text>
        )}

        {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            !isValid && styles.primaryBtnDisabled,
          ]}
          onPress={submit}
          disabled={!isValid}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Submit dispute</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  reasonText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  reasonHint: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 110,
  },
  counter: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  attachmentName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  attachmentMeta: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  errorText: {
    marginTop: 8,
    color: '#b91c1c',
    fontFamily: 'Inter-Medium',
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
