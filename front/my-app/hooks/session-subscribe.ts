import { useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { usePathname } from "next/navigation";
import { db } from "@/firebase";
import { fetchUserKeys } from "@/lib/fetch-user-keys";

// 로컬 스토리지 키
const LOCAL_STORAGE_KEY = "selectedSession";

interface Session {
  session_id: string;
  platform: "kakao" | "naver";
}

export default function useSessionSubscription(user: any) {
  const pathname = usePathname();
  const [kakaoKey, setKakaoKey] = useState("");
  const [naverKey, setNaverKey] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(() => {
    const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedSession ? JSON.parse(savedSession) : null;
  });
  const [formattedMessages, setFormattedMessages] = useState<any[]>([]);
  const unsubscribesRef = useRef<(() => void)[]>([]);

  /**
   * ✅ 사용자 키 로드
   */
  useEffect(() => {
    const loadUserKeys = async () => {
      if (!user?.uid) return;
      
      const keys = await fetchUserKeys(user.uid);
      setKakaoKey(keys.kakaoApiKey || "");
      setNaverKey(keys.naverApiKey || "");
    };

    loadUserKeys();
  }, [user, pathname]);

  /**
   * ✅ 세션 구독 설정
   */
  useEffect(() => {
    if (!kakaoKey && !naverKey) return;

    unsubscribesRef.current.forEach((unsub) => unsub());
    unsubscribesRef.current = [];

    const subscribeToPlatform = (platform: string, key: string) => {
      const colRef = collection(db, `sessions_${key}`);
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        const newSessions: any[] = [];
        snapshot.forEach((doc) => {
          newSessions.push({ id: doc.id, platform, ...doc.data() });
        });

        setSessions((prev) => {
          const filtered = prev.filter((s) => s.platform !== platform);
          return [...filtered, ...newSessions];
        });
      });

      unsubscribesRef.current.push(unsubscribe);
    };

    if (kakaoKey) subscribeToPlatform("kakao", kakaoKey);
    if (naverKey) subscribeToPlatform("naver", naverKey);

    return () => {
      unsubscribesRef.current.forEach((unsub) => unsub());
    };
  }, [kakaoKey, naverKey, pathname]);

  /**
   * ✅ selectedSession을 로컬 스토리지에 저장
   */
  useEffect(() => {
    if (selectedSession) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedSession));
    }
  }, [selectedSession]);

  /**
   * ✅ selectedSession이 변경되거나 페이지 로드 시 메시지 구독
   */
  useEffect(() => {
    if (!selectedSession?.session_id) return;

    const { platform, session_id } = selectedSession;

    const collectionName = 
      platform === "kakao" ? `sessions_${kakaoKey}` : 
      platform === "naver" ? `sessions_${naverKey}` : 
      null;

    if (!collectionName) return;

    const unsubscribe = onSnapshot(
      doc(db, collectionName, session_id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormattedMessages(data.messages || []);
          console.log("🟢 Messages updated:", data.messages);
        }
      },
      (error) => {
        console.error("❌ Error loading messages:", error.message);
      }
    );

    return () => unsubscribe();
  }, [selectedSession, kakaoKey, naverKey]);

  /**
   * ✅ 세션 선택 함수
   */
  const selectSession = (session: Session) => {
    setSelectedSession(session);
  };

  return {
    sessions,
    formattedMessages,
    selectedSession,
    selectSession,
  };
}
