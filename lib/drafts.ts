const prefix = "ssakiwo-draft:v1:";

export function readDraft(key: string): string | null {
  try {
    return sessionStorage.getItem(prefix + key);
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: string): void {
  try {
    sessionStorage.setItem(prefix + key, value);
  } catch { /* 브라우저가 저장을 막아도 입력은 계속할 수 있다. */ }
}

export function removeDraft(key: string): void {
  try {
    sessionStorage.removeItem(prefix + key);
  } catch { /* 저장소 접근이 불가능한 경우에도 화면은 계속 동작한다. */ }
}
