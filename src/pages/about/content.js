// 소개 페이지의 문구 — 글을 고칠 때는 이 파일만 고치면 됨
// 앱의 동작과 맞아야 하는 숫자(80%, 30일, 하루 한 번 등)는 README 의 주요 기능과 같게 유지

export const HERO = {
  eyebrow: '친구와 함께하는 매일 복근 운동',
  title: ['10분의 꾸준함이', '만드는 단단함'],
  body: '그룹을 만들어 매일 복근 운동을 하고, 기록을 나눠요. 혼자서는 작심삼일이던 운동이 같이 하면 습관이 돼요.',
  cta: '지금 시작하기',
  note: '가입 없이 비회원으로도 바로 쓸 수 있어요.',
}

// 휴대폰을 화면에 고정해 두고 한 단계씩 넘기는 기능 소개
// screen: screens.jsx 의 어떤 화면을 보여 줄지 (Showcase.jsx 의 SCREENS 와 짝)
export const SHOWCASE = [
  {
    key: 'home',
    label: '매일',
    title: ['하루 한 번,', '오늘의 운동 하나'],
    body: '날짜에 맞는 Day 1부터 30까지의 영상이 준비돼 있어요. 연속 운동일과 주간 리포트로 꾸준함이 한눈에 보여요.',
    screen: 'home',
  },
  {
    key: 'complete',
    label: '완료',
    title: ['끝까지 하면,', '기록은 저절로'],
    body: '영상을 80% 이상 보면 완료로 기록돼요. 시청 시간은 서버가 확인하고, 인증샷도 한 장 남길 수 있어요.',
    screen: 'complete',
  },
  {
    key: 'group',
    label: '함께',
    title: ['혼자가 아니라,', '같이'],
    body: '초대 코드로 친구를 부르고 서로의 일주일을 확인해요. 하루 한 번 응원을 보낼 수 있어요.',
    hint: '화면 속 응원 버튼을 눌러 보세요.',
    screen: 'group',
  },
  {
    key: 'rank',
    label: '경쟁',
    title: ['선의의 경쟁이', '만드는 꾸준함'],
    body: '이번 주, 이번 달, 원하는 기간의 인증 횟수로 순위를 매겨요. 지난 기간보다 올랐는지도 보여요.',
    screen: 'rank',
  },
]

export const NUMBERS = {
  title: ['작게 시작해서', '끝까지 가도록'],
  items: [
    { value: 10, unit: '분', label: '하루에 필요한 시간' },
    { value: 30, unit: '일', label: 'Day 1부터 이어지는 프로그램' },
    { value: 1, unit: '번', label: '하루에 운동 하나면 충분' },
  ],
}

export const THEME = {
  title: ['밝게도,', '어둡게도'],
  body: '휴대폰 설정을 따라가거나 직접 고를 수 있어요. 가운데 선을 좌우로 끌어 두 화면을 비교해 보세요.',
  dark: '다크',
  light: '라이트',
}

// icon: sections/Features.jsx 의 ICONS 에 있는 이름
export const FEATURES = {
  title: ['꾸준함을 돕는', '작은 장치들'],
  items: [
    {
      icon: 'camera',
      title: '인증샷',
      body: '운동을 마치고 사진 한 장. 그룹의 오늘 인증샷에 모이고, 같은 그룹 멤버만 볼 수 있어요.',
    },
    {
      icon: 'bell',
      title: '리마인더',
      body: '저녁까지 운동 전이면 홈 배너와 푸시 알림으로 알려 줘요. 응원을 받아도 알림이 와요.',
    },
    {
      icon: 'bolt',
      title: '바로 시작',
      body: '가입 없이 비회원으로 써 볼 수 있어요. 기록은 이 기기에 저장돼요.',
    },
    {
      icon: 'phone',
      title: '앱처럼',
      body: '홈 화면에 추가하면 앱처럼 바로 열려요. 설치할 필요가 없어요.',
    },
    {
      icon: 'shield',
      title: '신고와 차단',
      body: '불편한 인증샷은 신고할 수 있어요. 차단한 멤버의 기록과 응원은 보이지 않아요.',
    },
    {
      icon: 'sheet',
      title: '기록 내보내기',
      body: '운동 기록을 CSV 파일로 받아 구글시트에서 열 수 있어요.',
    },
  ],
}

export const CTA = {
  title: ['오늘의 10분,', '지금 시작해요'],
  body: '가입 없이 써 보고, 마음에 들면 친구를 불러요.',
  cta: '지금 시작하기',
}

export const LINKS = {
  app: '/',
  github: 'https://github.com/goneonly/ABSolid',
}
