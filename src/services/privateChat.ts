// Özel Mesaj (PM/Whisper) Sistemi
// Firebase modunda: rooms/_pm/{conversationId}/messages
// Demo modunda: localStorage + BroadcastChannel
import {
  db,
  isFirebaseConfigured,
  ref,
  push,
  set,
  onValue,
  serverTimestamp,
  query,
  limitToLast,
  off,
} from "../firebase";
import type { Message } from "../types";
import { getAvatarColor } from "../data/rooms";

// İki UID'den deterministik conversation ID üret
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("__");
}

// Demo channel (aynı tarayıcıda PM testi için)
type Listener<T> = (data: T) => void;
const demoListeners = new Map<string, Set<Listener<any>>>();
const demoChannels = new Map<string, BroadcastChannel>();

function getDemoChannel(name: string): BroadcastChannel {
  if (!demoChannels.has(name)) {
    const ch = new BroadcastChannel(name);
    ch.onmessage = (ev) => {
      demoListeners.get(name)?.forEach((l) => l(ev.data));
    };
    demoChannels.set(name, ch);
  }
  return demoChannels.get(name)!;
}

function demoSubscribe(name: string, fn: Listener<any>): () => void {
  if (!demoListeners.has(name)) demoListeners.set(name, new Set());
  demoListeners.get(name)!.add(fn);
  getDemoChannel(name);
  return () => demoListeners.get(name)?.delete(fn);
}

function demoPublish(name: string, data: any) {
  getDemoChannel(name).postMessage(data);
  demoListeners.get(name)?.forEach((l) => l(data));
}

const demoPmKey = (convId: string) => `sohbetgo_pm_${convId}`;

function loadDemoPm(convId: string): Message[] {
  try {
    return JSON.parse(localStorage.getItem(demoPmKey(convId)) || "[]");
  } catch {
    return [];
  }
}

function saveDemoPm(convId: string, msgs: Message[]) {
  localStorage.setItem(demoPmKey(convId), JSON.stringify(msgs.slice(-100)));
}

// PM gönder
export function sendPrivateMessage(
  fromUid: string,
  fromUsername: string,
  toUid: string,
  toUsername: string,
  text: string
) {
  const convId = getConversationId(fromUid, toUid);
  const cleanText = text.trim().slice(0, 500);
  if (!cleanText) return;

  const avatarColor = getAvatarColor(fromUid);

  if (isFirebaseConfigured && db) {
    const msgRef = push(ref(db, `pm/${convId}/messages`));
    set(msgRef, {
      uid: fromUid,
      username: fromUsername,
      avatarColor,
      text: cleanText,
      timestamp: serverTimestamp(),
      toUid,
      toUsername,
    });

    // Karşı taraf için "yeni PM" bildirimi
    set(ref(db, `pm_notifications/${toUid}/${convId}`), {
      from: fromUsername,
      fromUid,
      lastMessage: cleanText.slice(0, 100),
      timestamp: serverTimestamp(),
      unread: true,
    });
    return;
  }

  // Demo
  const msg: Message = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    uid: fromUid,
    username: fromUsername,
    avatarColor,
    text: cleanText,
    timestamp: Date.now(),
    roomId: `pm:${convId}`,
  };
  const msgs = loadDemoPm(convId);
  msgs.push(msg);
  saveDemoPm(convId, msgs);
  demoPublish(`pm_${convId}`, msg);

  // Bildirim
  const notifKey = `sohbetgo_pm_notif_${toUid}`;
  let notifs: Record<string, any> = {};
  try {
    notifs = JSON.parse(localStorage.getItem(notifKey) || "{}");
  } catch {}
  notifs[convId] = {
    from: fromUsername,
    fromUid,
    lastMessage: cleanText.slice(0, 100),
    timestamp: Date.now(),
    unread: true,
  };
  localStorage.setItem(notifKey, JSON.stringify(notifs));
  demoPublish(`pm_notif_${toUid}`, notifs);
}

// PM mesajlarına abone ol
export function subscribePrivateMessages(
  uid1: string,
  uid2: string,
  callback: (messages: Message[]) => void
): () => void {
  const convId = getConversationId(uid1, uid2);

  if (isFirebaseConfigured && db) {
    const msgsRef = query(ref(db, `pm/${convId}/messages`), limitToLast(100));
    const handler = onValue(msgsRef, (snap) => {
      const data = snap.val() || {};
      const msgs: Message[] = Object.entries(data).map(
        ([id, val]: [string, any]) => ({
          id,
          uid: val.uid,
          username: val.username,
          avatarColor: val.avatarColor || getAvatarColor(val.uid),
          text: val.text,
          timestamp: val.timestamp || Date.now(),
          roomId: `pm:${convId}`,
        })
      );
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      callback(msgs);
    });
    return () => off(msgsRef, "value", handler);
  }

  callback(loadDemoPm(convId));
  return demoSubscribe(`pm_${convId}`, () => callback(loadDemoPm(convId)));
}

// PM bildirimlerine abone ol
export interface PmNotification {
  convId: string;
  from: string;
  fromUid: string;
  lastMessage: string;
  timestamp: number;
  unread: boolean;
}

export function subscribePmNotifications(
  uid: string,
  callback: (notifs: PmNotification[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const notifRef = ref(db, `pm_notifications/${uid}`);
    const handler = onValue(notifRef, (snap) => {
      const data = snap.val() || {};
      const list: PmNotification[] = Object.entries(data).map(
        ([convId, val]: [string, any]) => ({
          convId,
          from: val.from,
          fromUid: val.fromUid,
          lastMessage: val.lastMessage,
          timestamp: val.timestamp || Date.now(),
          unread: !!val.unread,
        })
      );
      list.sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    });
    return () => off(notifRef, "value", handler);
  }

  // Demo
  const notifKey = `sohbetgo_pm_notif_${uid}`;
  const load = () => {
    try {
      const data = JSON.parse(localStorage.getItem(notifKey) || "{}");
      const list: PmNotification[] = Object.entries(data).map(
        ([convId, val]: [string, any]) => ({
          convId,
          from: val.from,
          fromUid: val.fromUid,
          lastMessage: val.lastMessage,
          timestamp: val.timestamp || Date.now(),
          unread: !!val.unread,
        })
      );
      list.sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    } catch {
      callback([]);
    }
  };
  load();
  return demoSubscribe(`pm_notif_${uid}`, load);
}

// Bildirimi okundu işaretle
export function markPmAsRead(uid: string, convId: string) {
  if (isFirebaseConfigured && db) {
    set(ref(db, `pm_notifications/${uid}/${convId}/unread`), false);
    return;
  }

  const notifKey = `sohbetgo_pm_notif_${uid}`;
  try {
    const data = JSON.parse(localStorage.getItem(notifKey) || "{}");
    if (data[convId]) {
      data[convId].unread = false;
      localStorage.setItem(notifKey, JSON.stringify(data));
      demoPublish(`pm_notif_${uid}`, data);
    }
  } catch {}
}

// Aktif PM penceresi listesi (localStorage)
export interface OpenPmWindow {
  uid: string;
  username: string;
  openedAt: number;
}

const OPEN_PMS_KEY = "sohbetgo_open_pms";

export function getOpenPms(): OpenPmWindow[] {
  try {
    return JSON.parse(localStorage.getItem(OPEN_PMS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function openPm(uid: string, username: string) {
  const list = getOpenPms();
  if (!list.find((p) => p.uid === uid)) {
    list.push({ uid, username, openedAt: Date.now() });
    localStorage.setItem(OPEN_PMS_KEY, JSON.stringify(list));
  }
  window.dispatchEvent(new CustomEvent("sohbetgo:pm-open", { detail: { uid, username } }));
}

export function closePm(uid: string) {
  const list = getOpenPms().filter((p) => p.uid !== uid);
  localStorage.setItem(OPEN_PMS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("sohbetgo:pm-close", { detail: { uid } }));
}
