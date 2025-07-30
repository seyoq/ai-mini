import { useEffect, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { usePathname } from "next/navigation";
import { db } from "@/firebase"; // Firebase 초기화 설정

const useSubscribeSessions = (kakaoKey: string, naverKey: string) => {
  const pathname = usePathname();
  const unsubscribesRef = useRef<(() => void)[]>([]);

  const subscribe = (platform: string, key: string) => {
    const colRef = collection(db, `sessions_${key}`);

    const unsubscribe = onSnapshot(
      colRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        const sessions = snapshot.docs.map((doc) => ({
          id: doc.id,
          platform,
          ...doc.data(),
        }));

        console.log(`Updated sessions for ${platform}:`, sessions);
      }
    );

    unsubscribesRef.current.push(unsubscribe);
  };

  const clearSubscriptions = () => {
    unsubscribesRef.current.forEach((unsub) => unsub());
    unsubscribesRef.current = [];
  };

  useEffect(() => {
    console.log("Pathname changed:", pathname);

    clearSubscriptions();

    if (kakaoKey) subscribe("kakao", kakaoKey);
    if (naverKey) subscribe("naver", naverKey);

    return () => {
      console.log("Cleaning up subscriptions...");
      clearSubscriptions();
    };
  }, [kakaoKey, naverKey, pathname]);
};

export default useSubscribeSessions;
