import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const LEGAL_DOCS = [
  { id: 'terms', title: 'Terms & Conditions', updated: '1 January 2026' },
  { id: 'privacy', title: 'Privacy Policy', updated: '15 December 2025' },
  { id: 'user_agreement', title: 'User Agreement', updated: '1 January 2026' },
  { id: 'cookies', title: 'Cookie Policy', updated: '1 November 2025' },
  { id: 'regulatory', title: 'Regulatory Information', updated: '1 October 2025' },
];

const PLACEHOLDER_CONTENT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

1. INTRODUCTION
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

2. YOUR RIGHTS
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

3. OUR OBLIGATIONS
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

4. LIMITATIONS
Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

5. CONTACT
If you have any questions about this document, please contact us at legal@tescowallet.com`;

export default function LegalScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [selectedDoc, setSelectedDoc] = useState<typeof LEGAL_DOCS[0] | null>(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Legal</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          {LEGAL_DOCS.map((doc, idx) => (
            <TouchableOpacity
              key={doc.id}
              style={[styles.docRow, idx < LEGAL_DOCS.length - 1 && [styles.docRowBorder, { borderBottomColor: colors.borderLight }]]}
              onPress={() => setSelectedDoc(doc)}
            >
              <View style={styles.docInfo}>
                <Text style={[styles.docTitle, { color: colors.text }]}>{doc.title}</Text>
                <Text style={[styles.docUpdated, { color: colors.textTertiary }]}>Updated {doc.updated}</Text>
              </View>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!selectedDoc} animationType="slide" presentationStyle="pageSheet">
        {selectedDoc && (
          <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedDoc.title}</Text>
                <Text style={[styles.modalUpdated, { color: colors.textTertiary }]}>Last updated: {selectedDoc.updated}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDoc(null)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={[styles.docContent, { color: colors.textSecondary }]}>{PLACEHOLDER_CONTENT}</Text>
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[styles.downloadBtn, { borderColor: colors.primary }]}>
                <Text style={[styles.downloadBtnText, { color: colors.primary }]}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  docRowBorder: { borderBottomWidth: 1 },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  docUpdated: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-Bold' },
  modalUpdated: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  modalContent: { padding: 16, paddingBottom: 40 },
  docContent: { fontSize: 17, fontFamily: 'Inter-Regular', lineHeight: 24 },
  modalFooter: { padding: 16, borderTopWidth: 1 },
  downloadBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  downloadBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
