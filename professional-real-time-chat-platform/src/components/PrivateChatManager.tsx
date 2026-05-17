import { useEffect, useRef, useState } from "react";
import PrivateChatWindow from "./PrivateChatWindow";
import {
  subscribePmNotifications,
  openPm,
  closePm,
  getOpenPms,
  type PmNotification,
} from "../services/privateChat";
import { showNotification } from "../services/notifications";

interface Props {
  myUid: string;
  myUsername: string;
}

interface PmTab {
  uid: string;
  username: string;
  minimized: boolean;
}

export default function PrivateChatManager({ myUid, myUsername }: Props) {
  const [tabs, setTabs] = useState<PmTab[]>(() =>
    getOpenPms().map((p) => ({ uid: p.uid, username: p.username, minimized: false }))
  );
  const [notifs, setNotifs] = useState<PmNotification[]>([]);

  // Bildirimleri dinle
  useEffect(() => {
    const unsub = subscribePmNotifications(myUid, setNotifs);
    return unsub;
  }, [myUid]);

  // Yeni PM açma event'leri
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { uid: string; username: string };
      if (detail.uid === myUid) return;
      setTabs((prev) => {
        const existing = prev.find((t) => t.uid === detail.uid);
        if (existing) {
          // Var olanı öne al ve maximize et
          return prev.map((t) =>
            t.uid === detail.uid ? { ...t, minimized: false } : t
          );
        }
        return [...prev, { uid: detail.uid, username: detail.username, minimized: false }];
      });
    };

    const onClose = (e: Event) => {
      const detail = (e as CustomEvent).detail as { uid: string };
      setTabs((prev) => prev.filter((t) => t.uid !== detail.uid));
    };

    window.addEventListener("sohbetgo:pm-open", onOpen);
    window.addEventListener("sohbetgo:pm-close", onClose);
    return () => {
      window.removeEventListener("sohbetgo:pm-open", onOpen);
      window.removeEventListener("sohbetgo:pm-close", onClose);
    };
  }, [myUid]);

  // Daha önce bildirim verilen PM'leri takip et (tekrar bildirim olmasın)
  const seenNotifs = useRef<Set<string>>(new Set());

  // Yeni gelen okunmamış bildirimler için otomatik tab aç (minimize) + browser notification
  useEffect(() => {
    notifs
      .filter((n) => n.unread)
      .forEach((n) => {
        setTabs((prev) => {
          const existing = prev.find((t) => t.uid === n.fromUid);
          if (existing) return prev;
          openPm(n.fromUid, n.from);
          return [
            ...prev,
            { uid: n.fromUid, username: n.from, minimized: true },
          ];
        });

        // Browser notification (bir kez)
        const notifKey = `${n.fromUid}_${n.timestamp}`;
        if (!seenNotifs.current.has(notifKey)) {
          seenNotifs.current.add(notifKey);
          showNotification(`💌 ${n.from}'dan PM`, {
            body: n.lastMessage,
            tag: `pm-${n.fromUid}`,
            url: "/#/chat",
          });
        }
      });
  }, [notifs]);

  const handleClose = (uid: string) => {
    closePm(uid);
    setTabs((prev) => prev.filter((t) => t.uid !== uid));
  };

  const handleMinimize = (uid: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.uid === uid ? { ...t, minimized: !t.minimized } : t))
    );
  };

  const getUnreadCount = (peerUid: string): number => {
    const n = notifs.find((x) => x.fromUid === peerUid && x.unread);
    return n ? 1 : 0;
  };

  if (tabs.length === 0) return null;

  // Açık (büyütülmüş) pencereler — sağda yan yana
  const opened = tabs.filter((t) => !t.minimized);
  const minimized = tabs.filter((t) => t.minimized);

  return (
    <>
      {/* Açık PM pencereleri — sağ alt köşede */}
      <div className="fixed bottom-0 right-2 sm:right-4 z-40 flex items-end gap-2 pointer-events-none">
        {opened.map((tab) => (
          <div key={tab.uid} className="pointer-events-auto">
            <PrivateChatWindow
              myUid={myUid}
              myUsername={myUsername}
              peerUid={tab.uid}
              peerUsername={tab.username}
              onClose={() => handleClose(tab.uid)}
              onMinimize={() => handleMinimize(tab.uid)}
              unreadCount={getUnreadCount(tab.uid)}
            />
          </div>
        ))}
      </div>

      {/* Küçültülmüş PM tab'ları — sol alt köşede */}
      {minimized.length > 0 && (
        <div className="fixed bottom-0 left-2 z-40 flex items-end gap-1 flex-wrap max-w-[60vw]">
          {minimized.map((tab) => (
            <PrivateChatWindow
              key={tab.uid}
              myUid={myUid}
              myUsername={myUsername}
              peerUid={tab.uid}
              peerUsername={tab.username}
              onClose={() => handleClose(tab.uid)}
              onMinimize={() => handleMinimize(tab.uid)}
              minimized
              unreadCount={getUnreadCount(tab.uid)}
              onFocus={() => handleMinimize(tab.uid)}
            />
          ))}
        </div>
      )}
    </>
  );
}
