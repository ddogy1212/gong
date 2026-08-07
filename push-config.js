/* 공게임 V283 Web Push 공개 설정
 * Firebase Console > Project settings > Cloud Messaging > Web Push certificates
 * 에서 발급한 "공개 VAPID 키"만 아래 값에 넣는다.
 * 비공개 키/서비스 계정 키는 절대 이 파일이나 GitHub에 넣지 않는다.
 */
window.GONG_PUSH_VAPID_KEY = window.GONG_PUSH_VAPID_KEY || '';
