import SubscribeClient from './SubscribeClient';

export const metadata = {
  title: '구독하기 — 아침 브리핑',
  description: '매일 아침, AI가 정리하는 깊이 있는 뉴스 브리핑을 구독하세요. 월 3,900원.',
};

export default function SubscribePage() {
  return <SubscribeClient />;
}
