import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../../../stores/authStore";
import { PAGE_SIZE, getRange } from "../../../lib/pagination";
import { supabase } from "../../../lib/supabase";

type SessionRow = {
  id: string;
  subject: string;
  room: string;
  created_at: string;
  session_type: string;
  event_name: string | null;
};

const BLUE = "#305CDE";
const FADED_BLUE = "#F0F3FF";

export default function FacultySessionHistory() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const isStudentCouncil = role === "student_council_officer";

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSessions = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { from, to } = getRange(page);

    const { data, count } = await supabase
      .from("sessions")
      .select("id, subject, room, created_at, session_type, event_name", {
        count: "exact",
      })
      .eq("faculty_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data) setSessions(data);

    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [page]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <View style={styles.headerTitleArea}>
          <Text style={styles.title}>Session History</Text>
          <Text style={styles.subtitle}>
            View your previous attendance sessions
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Ionicons name="calendar-outline" size={18} color={BLUE} />
          <Text style={styles.countText}>{totalCount.toLocaleString()}</Text>
        </View>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchSessions}
        renderItem={({ item }) => (
          <View style={styles.sessionCard}>
            <TouchableOpacity
              style={styles.rowLeft}
              onPress={() => router.push(`/faculty/sessions/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.rowHeader}>
                <Text style={styles.subject} numberOfLines={1}>
                  {item.session_type === "event"
                    ? item.event_name
                    : item.subject}
                </Text>
                {item.session_type === "event" && (
                  <View style={styles.eventBadge}>
                    <Text style={styles.eventBadgeText}>EVENT</Text>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.meta}>{item.room}</Text>
                <Text>-</Text>
                <Text style={styles.meta}>
                  {new Date(item.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  ·{" "}
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>

            {isStudentCouncil && item.session_type === "event" && (
              <TouchableOpacity
                style={styles.resumeBtn}
                onPress={() =>
                  router.push({
                    pathname: "/faculty/qrgenerator",
                    params: { resume: item.id },
                  })
                }
                activeOpacity={0.75}
              >
                <Ionicons name="refresh-outline" size={17} color={BLUE} />

                <Text style={styles.resumeBtnText}>Resume</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push(`/faculty/sessions/${item.id}`)}
              style={styles.chevronButton}
            >
              <Ionicons name="chevron-forward" size={23} color="#C3C6D5" />
            </TouchableOpacity>
          </View>
        )}

        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={27} color="#AAB0C5" />
              </View>

              <Text style={styles.emptyTitle}>No sessions yet</Text>

              <Text style={styles.emptyText}>
                Your completed sessions will appear here.
              </Text>
            </View>
          ) : null
        }
      />

      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pagerButton, page === 0 && styles.pagerButtonDisabled]}
          onPress={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          activeOpacity={0.75}
        >
          <Ionicons
            name="chevron-back"
            size={17}
            color={page === 0 ? "#AEB2C1" : BLUE}
          />
          <Text
            style={[styles.pagerText, page === 0 && styles.pagerTextDisabled]}
          >
            Previous
          </Text>
        </TouchableOpacity>
        <View style={styles.pageInfo}>
          <Text style={styles.pageNumber}>
            {totalCount === 0 ? "0" : `${page * PAGE_SIZE + 1}`}
          </Text>

          <Text style={styles.pageOf}> of {totalCount}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.pagerButton,
            (page + 1) * PAGE_SIZE >= totalCount && styles.pagerButtonDisabled,
          ]}
          onPress={() => setPage((p) => p + 1)}
          disabled={(page + 1) * PAGE_SIZE >= totalCount}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.pagerText,
              (page + 1) * PAGE_SIZE >= totalCount && styles.pagerTextDisabled,
            ]}
          >
            Next
          </Text>

          <Ionicons
            name="chevron-forward"
            size={17}
            color={(page + 1) * PAGE_SIZE >= totalCount ? "#AEB2C1" : BLUE}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFF",
  },

  header: {
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 22,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F6",
    marginTop: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitleArea: {
    flex: 1,
    paddingRight: 15,
  },

  title: {
    color: "#000",
    fontSize: 31,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  subtitle: {
    marginTop: 5,
    color: "#777B8C",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },

  countBadge: {
    minWidth: 76,
    height: 43,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: FADED_BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  countText: {
    color: BLUE,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  list: {
    paddingHorizontal: 30,
    paddingTop: 22,
    paddingBottom: 20,
    flexGrow: 1,
  },

  sessionCard: {
    minHeight: 108,
    marginBottom: 12,
    paddingHorizontal: 21,
    paddingVertical: 19,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0F1F6",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },

  rowLeft: {
    flex: 1,
    justifyContent: "center",
  },

  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingRight: 5,
  },

  subject: {
    flexShrink: 1,
    color: "#111525",
    fontSize: 19,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: FADED_BLUE,
  },

  eventBadgeText: {
    color: BLUE,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* ================= META ================= */

  metaRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },

  meta: {
    color: "#777B8C",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  resumeBtn: {
    height: 38,
    marginLeft: 8,
    marginRight: 5,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: FADED_BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  resumeBtnText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  chevronButton: {
    width: 28,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 70,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: FADED_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#303447",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  emptyText: {
    marginTop: 5,
    color: "#969AAA",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  pagination: {
    minHeight: 72,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F0F1F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pagerButton: {
    height: 40,
    paddingHorizontal: 13,
    borderRadius: 11,
    backgroundColor: FADED_BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  pagerButtonDisabled: {
    backgroundColor: "#F5F5F8",
  },

  pagerText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  pagerTextDisabled: {
    color: "#AEB2C1",
  },

  pageInfo: {
    flexDirection: "row",
    alignItems: "baseline",
  },

  pageNumber: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  pageOf: {
    color: "#8D91A1",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
