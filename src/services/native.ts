import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";
import { base64, getBlob, type Doc } from "./storage";
export async function takePhoto() {
  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    correctOrientation: true,
  });
  if (!photo.webPath) throw Error("Não foi possível abrir a foto.");
  return (await fetch(photo.webPath)).blob();
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export async function shareDoc(doc: Doc) {
  const blob = await getBlob(doc);
  const name =
    doc.name.replace(/[^\p{L}\p{N} ._-]/gu, "_") +
    (doc.mime === "application/pdf" ? ".pdf" : ".jpg");
  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: name,
      data: await base64(blob),
      directory: Directory.Cache,
    });
    await Share.share({
      title: doc.name,
      files: [file.uri],
      dialogTitle: "Compartilhar documento",
    });
  } else {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [file] }))
      await navigator.share({ files: [file], title: doc.name });
    else download(blob, name);
  }
}
export async function schedule(doc: Doc) {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({
    notifications: [{ id: doc.notificationId }],
  });
  if (!doc.expires) return;
  const at = new Date(doc.expires + "T09:00:00");
  if (at <= new Date()) return;
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted")
    throw Error(
      "Data salva. Permita notificações nos ajustes do dispositivo para receber o alerta.",
    );
  await LocalNotifications.schedule({
    notifications: [
      {
        id: doc.notificationId,
        title: "Documento a vencer",
        body: "Confira os vencimentos no OrganizaFácil.",
        schedule: { at },
      },
    ],
  });
}
export async function cancelNotification(doc: Doc) {
  if (Capacitor.isNativePlatform())
    await LocalNotifications.cancel({
      notifications: [{ id: doc.notificationId }],
    });
}
