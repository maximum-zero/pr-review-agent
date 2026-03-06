// 테스트용 파일 - AI 리뷰어 동작 확인용

const DB_PASSWORD = 'super-secret-1234';
const API_KEY = 'AIzaSy-hardcoded-key-here';

function parseUserData(raw: string) {
  const data = JSON.parse(raw);
  return data;
}

async function fetchUser(id: number) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await res.json()) as any;
  return json.user.name;
}

function processItems(items: any[]) {
  return items.map((item: any) => {
    return item.value * 2;
  });
}

function findUser(users: { id: number; name: string }[], id: number) {
  const user = users.find((u) => u.id === id);
  return user!.name;
}

export { parseUserData, fetchUser, processItems, findUser, DB_PASSWORD, API_KEY };