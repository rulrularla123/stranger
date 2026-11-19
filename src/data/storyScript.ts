export type StorySceneId = 'cafeteria' | 'classroom' | 'crosswalk' | 'camp' | 'museum_storm';

export type StorySpeakerKind =
  | 'narrator'
  | 'title'
  | 'doyun'
  | 'maria'
  | 'lin'
  | 'aisha'
  | 'jiho'
  | 'friend1'
  | 'friend2'
  | 'teacher'
  | 'staff';

export interface StorySlide {
  scene: StorySceneId;
  chapter: string;
  kind: StorySpeakerKind;
  speaker?: string;
  note?: string;
  thought?: boolean;
  title?: string;
  subtitle?: string;
  text?: string;
}

export const STORY_SLIDES: StorySlide[] = [
  // ── Scene 1: 중학교 점심시간 (12장 · 원판 1~12) ─────────────────────────────────
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'narrator',
    text: '한국의 어느 중학교, 점심시간. 서하린은 친구들과 왁자지껄 점심을 먹고 있다.\n몇 자리 떨어진 곳에는 지호가 혼자 앉아 있다.',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'friend1',
    speaker: '친구1',
    text: '야, 지호 너 한국말 진짜 잘한다ㅋㅋ 외국인 맞아?',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'jiho',
    speaker: '지호',
    note: '어색하게 웃으며',
    text: '어… 나 한국에서 태어났는데.',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'friend2',
    speaker: '친구2',
    text: '근데 너희 엄마는 어느 나라 사람이야? 베트남?',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'jiho',
    speaker: '지호',
    note: '머뭇거리다가',
    text: '어… 응. 베트남 분이셔.',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'friend1',
    speaker: '친구1',
    text: '오, 진짜? 그럼 베트남어도 할 줄 알아? 아무 말이나 해봐!',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'jiho',
    speaker: '지호',
    note: '난처하게 웃으며',
    text: '아… 집에서는 조금 쓰는데, 지금은 좀…',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'doyun',
    speaker: '서하린',
    text: "에이, 한마디만! 나도 궁금하다. 지호야, 베트남어로 '안녕'이 뭐야?",
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'jiho',
    speaker: '지호',
    note: '아주 작은 목소리로',
    text: '…씬 짜오.',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'friend2',
    speaker: '친구2',
    text: '오~ 신기하다ㅋㅋ 또 해봐, 또!',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'narrator',
    text: '서하린은 문제라고 느끼지 않고, 웃으며 자연스럽게 대화에 섞인다.',
  },
  {
    scene: 'cafeteria',
    chapter: '1. 점심시간',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '에이, 그냥 장난이지. 지호도 웃고 있잖아.',
  },

  // ── Scene 2: 다음 날 · 조별 과제 (19장 · 원판 13~31) ─────────────────────────────
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'title',
    title: '다음 날 · 조별 과제',
    subtitle: '사회 시간',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'narrator',
    text: "다음 날, 사회 시간. 칠판에는 '다문화 사회, 우리 주변의 이야기'라고 적혀 있다.\n선생님이 조별 과제 조 편성표를 붙이고 나간다.",
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'friend1',
    speaker: '친구1',
    text: '야야, 우리 조 누구야? 나 하린이랑 같은 조 맞지?',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'doyun',
    speaker: '서하린',
    note: '명단을 훑어보다가',
    text: '어디 보자… 나, 너, 쟤, 그리고… 어, 지호도 우리 조네.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'friend2',
    speaker: '친구2',
    text: '오, 지호 우리 조야? 잘됐다. 이번 주제 완전 너 얘기네ㅋㅋ',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'jiho',
    speaker: '지호',
    note: '조심스럽게',
    text: '어… 잘 부탁해.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'doyun',
    speaker: '서하린',
    note: '잠깐 머뭇거리다가',
    text: '어, 어. 잘 부탁해.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'friend1',
    speaker: '친구1',
    text: '발표는 누가 해? 지호 네가 해도 되겠다. 베트남 얘기 하면 딱이잖아.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'jiho',
    speaker: '지호',
    note: '머쓱하게',
    text: '나는… 사실 베트남에 가 본 적도 별로 없어서. 잘 모르는데…',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'doyun',
    speaker: '서하린',
    note: '웃으며',
    text: '아, 그럼 발표는 내가 할게. 내가 말하는 건 좀 잘하잖아.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'friend2',
    speaker: '친구2',
    text: '맞네, 하린아 네가 하면 되겠네.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'jiho',
    speaker: '지호',
    note: '아주 작은 목소리로',
    text: '저기… 나도 하고 싶은 부분이 있는데…',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'doyun',
    speaker: '서하린',
    note: '이미 노트를 펴며',
    text: '아, 괜찮아 괜찮아. 넌 그냥… 자료만 정리해 줄래? 발표는 내가 할게.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'jiho',
    speaker: '지호',
    note: '잠시 말이 없다가',
    text: '…응. 알겠어.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'narrator',
    text: '지호는 고개를 끄덕인다. 아주 잠깐, 표정에 옅은 실망이 스친다.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '발표는 내가 하는 게 낫지. 괜히 맡겼다가 지호가 부담스러워할 수도 있고.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'friend1',
    speaker: '친구1',
    text: '하린아, 끝나고 PC방 갈 거지?',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'doyun',
    speaker: '서하린',
    text: '당연하지! 먼저 가 있어, 금방 갈게.',
  },
  {
    scene: 'classroom',
    chapter: '2. 조별 과제',
    kind: 'narrator',
    text: '종이 울리자 아이들은 우르르 교실을 빠져나간다.\n지호는 혼자 남아, 조용히 자료를 정리하기 시작한다.',
  },

  // ── Scene 3: 며칠 후 · 하굣길 (13장 · 원판 32~44) ─────────────────────────────
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'title',
    title: '며칠 후 · 하굣길',
    subtitle: '학교 앞 횡단보도',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'narrator',
    text: '며칠 뒤, 하굣길. 서하린은 친구들과 헤어져 혼자 교문을 나선다.\n횡단보도 앞에서 신호가 바뀌기를 기다리는데, 뒤에서 누군가 서하린을 부른다.',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'teacher',
    speaker: '담임 선생님',
    text: '하린아! 잠깐만 기다려 봐.',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'doyun',
    speaker: '서하린',
    text: '어, 선생님. 무슨 일이세요?',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'teacher',
    speaker: '담임 선생님',
    text: '좋은 소식이 있어서. 이번에 국제 청소년 교류 캠프 대표로 네가 뽑혔어.',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'doyun',
    speaker: '서하린',
    note: '놀라서',
    text: '네? 제가요?',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'teacher',
    speaker: '담임 선생님',
    text: '그래. 선생님들 사이에서 네가 친구들을 잘 이끈다고 말이 많더라.\n이번 조별 과제도 네가 잘 맡았고.',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'teacher',
    speaker: '담임 선생님',
    text: '여러 나라 친구들이랑 한 팀이 될 거야. 말도 문화도 다르니까 쉽지는 않겠지만,\n네가 잘 해낼 거라고 믿는다.',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'doyun',
    speaker: '서하린',
    note: '활짝 웃으며',
    text: '우와, 외국 친구들이랑요? 재밌겠다! 열심히 해 볼게요, 선생님.',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'teacher',
    speaker: '담임 선생님',
    text: '그래, 준비 잘하고 출발하기 전에 다시 안내해 줄게. 조심히 들어가렴.',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'narrator',
    text: '선생님이 돌아가고, 신호등이 초록색으로 바뀐다.\n서하린은 신이 나서 가방끈을 고쳐 메고 횡단보도를 건넌다.',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '외국인 친구들이랑 팀이 된다고? 뭐, 말은 안 통해도 내가 잘 챙겨주면 되겠지.',
  },
  {
    scene: 'crosswalk',
    chapter: '3. 하굣길',
    kind: 'narrator',
    text: '노을이 천천히 내려앉는다. 서하린의 발걸음은, 가볍다.',
  },

  // ── Scene 4: BAYANI CAMP 도착 (29장 · 원판 45~73) ───────────────────────────────
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'narrator',
    text: "필리핀. 해마다 태풍이 스무 개 가까이 지나가는 '태풍의 길목'이다.\n우기가 오면 이 나라는 같은 피해를 되풀이해서 겪는다.",
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'narrator',
    text: '그리고 오늘은 국제 청소년 교류 캠프의 첫날.\n서하린을 태운 버스가 BAYANI CAMP 앞에 천천히 멈춰 선다.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'narrator',
    text: '치이익— 버스 문이 열린다. 후끈한 공기가 훅 끼쳐 온다.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '와… 진짜 외국이다. 공기부터 다르네. 덥고, 습하고, 나무는 엄청 크고.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '내가 대표로 뽑힌 거니까 처음부터 잘해야지. 어깨 펴고, 웃으면서.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'narrator',
    text: "서하린은 캐리어를 끌고 버스에서 내린다.\n본관 입구의 현수막에는 'Together for a Brighter Tomorrow'라고 적혀 있다.",
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'maria',
    speaker: '이안',
    note: '환하게 손을 흔들며',
    text: 'Kumusta! Maligayang pagdating!',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '…무슨 말이지? 영어는 아닌데. 일단 웃자.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '자기 가슴을 톡톡 치며, 또박또박',
    text: '아, 안녕! 나는 서하린이야. 한국에서 왔어!',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'narrator',
    text: '이안이 고개를 갸웃한다. 서하린은 한 번 더, 더 천천히, 더 크게 말한다.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '큰 소리로',
    text: '하-린. 하린!',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'maria',
    speaker: '이안',
    note: '눈이 커지며',
    text: 'Harin? …Harin!',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '이안을 가리키며',
    text: '맞아, 하린! 너는?',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'maria',
    speaker: '이안',
    note: '자기를 가리키며',
    text: 'Ako si Ian. Ian!',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'lin',
    speaker: '린',
    note: '조용히 한 걸음 다가와',
    text: 'Xin chào! Tôi là Lin.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '이름은 알아듣겠는데… 뒤는 하나도 모르겠다.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'aisha',
    speaker: '카이',
    note: '두 팔을 크게 흔들며',
    text: 'Sawubona! Kai! I am Kai!',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'narrator',
    text: '카이가 손을 번쩍 들어 하이파이브를 청한다. 서하린이 마주 치자, 짝! 하고 경쾌한 소리가 난다.\n린은 두 손을 모으고 가볍게 고개를 숙인다.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '손짓이랑 표정으로는 얼추 통하네. 이 정도면 할 만한데?',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'maria',
    speaker: '이안',
    note: '서하린의 캐리어 손잡이를 가리키며',
    text: 'Tulungan na kita!',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '손을 휘휘 저으며',
    text: '아, 괜찮아 괜찮아! 내가 들 수 있어!',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'narrator',
    text: '이안은 멈칫하다가 웃으며 물러선다. 이번에는 린이 서하린의 물병을 가리키고, 카이가 본관을 가리킨다.\n세 사람이 자기 말로 한꺼번에 말을 걸어 오지만, 서하린에게는 어느 것도 말이 되지 않는다.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '정신없다… 그래도 다들 반겨 주는 건 알겠어.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '모두 말이 안 통해서 불편할 텐데. 내가 먼저 나서서 잘 챙겨 줘야겠다.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'narrator',
    text: '그때, 야자수 잎이 크게 흔들린다. 하늘 한쪽이 어느새 잿빛이다.\n이안이 그쪽을 한참 올려다본다.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '같이 올려다보며',
    text: '이안? 왜 그래? 하늘에 뭐 있어?',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'maria',
    speaker: '이안',
    note: '고개를 젓고는 다시 웃으며',
    text: '…Ayos lang. Halika na.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'narrator',
    text: '이안이 손짓으로 본관 쪽을 가리킨다. 마침 본관 문이 열리고, 스태프가 손뼉을 치며 모두를 불러 모은다.',
  },
  {
    scene: 'camp',
    chapter: '4. 캠프 도착',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '오늘부터 진짜 시작이구나. 좋아, 가 보자!',
  },

  // ── Scene 5: 미션 안내 (12장 · 원판 74~85) ───────────────────────────────────
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'title',
    title: '미션 안내',
    subtitle: 'BAYANI CAMP 본관 앞',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'narrator',
    text: '잠시 뒤, 본관 앞 공터. 스태프가 네 사람을 한자리에 불러 세운다.\n서하린, 이안, 린, 카이. 오늘부터 이 넷이 한 팀이다.',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'staff',
    speaker: '스태프',
    text: '모두 모였죠? 만나서 반갑습니다. 저는 이번 캠프 진행을 맡은 스태프예요.',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'staff',
    speaker: '스태프',
    text: '오늘부터는 팀별로 미션을 수행합니다. 네 명이 한 팀이에요.',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '다들 표정이 굳었네. 설명을 못 알아듣는 눈치야. 이럴 땐 내가 나서야지.',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'staff',
    speaker: '스태프',
    text: '첫 목적지는 박물관입니다. 서로 도와 가면서, 반드시 팀원끼리 힘을 합치세요.',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'staff',
    speaker: '스태프',
    text: '박물관 안은 복잡하니까 절대 혼자 떨어지지 마세요.\n하늘이 심상치 않아서, 일정은 서두르겠습니다.',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '첫 목적지가 박물관이래. 얘네는 못 알아들은 것 같은데… 그냥 내가 알아서 이끌면 되겠지.',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'doyun',
    speaker: '서하린',
    note: '손짓에 서툰 영어를 섞어 크게',
    text: '박물관! 뮤지엄! 우리, 같이, 가자!',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'lin',
    speaker: '린',
    note: '고개를 갸웃하며',
    text: '…Museum?',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'maria',
    speaker: '이안',
    note: '고개를 끄덕이며 앞장서서',
    text: 'Oo, museo. Tara na!',
  },
  {
    scene: 'camp',
    chapter: '5. 미션 안내',
    kind: 'narrator',
    text: '이안이 알겠다는 듯 앞장서 걷기 시작한다. 카이가 손을 번쩍 들고 뒤를 따르고,\n린도 말없이 걸음을 옮긴다.',
  },

  // ── Scene 6: 필리핀 역사박물관 · 태풍의 밤 (5장 · 인게임 연결 브릿지) ──────────
  {
    scene: 'museum_storm',
    chapter: '6. 태풍의 박물관',
    kind: 'title',
    title: '필리핀 역사박물관',
    subtitle: '태풍이 몰아치는 밤',
  },
  {
    scene: 'museum_storm',
    chapter: '6. 태풍의 박물관',
    kind: 'narrator',
    text: '네 명이 박물관 중앙 로비에 들어선 순간, 거센 태풍이 몰아치며 불이 모두 꺼지고\n사방의 전시실 문이 굳게 잠긴다.',
  },
  {
    scene: 'museum_storm',
    chapter: '6. 태풍의 박물관',
    kind: 'doyun',
    speaker: '서하린',
    note: '속마음',
    thought: true,
    text: '불이 다 꺼졌어… 혼자서는 아무것도 못 해. 말이 안 통해도 친구들과 서로 도와야 해!',
  },
  {
    scene: 'museum_storm',
    chapter: '6. 태풍의 박물관',
    kind: 'narrator',
    text: '이안은 옛 글자를, 린은 지도를, 카이는 유물을, 서하린은 기계를 가리키며 고개를 끄덕인다.\n각자 다른 단서만 볼 수 있는 팀이 되었다.',
  },
  {
    scene: 'museum_storm',
    chapter: '6. 태풍의 박물관',
    kind: 'narrator',
    text: '말은 달라도, 그림과 숫자 무전([C])으로 하나가 될 수 있다.\n네 명의 첫 협동 복원이 지금 시작된다.',
  },
];

export const STORY_SLIDE_COUNT = STORY_SLIDES.length;

export const STORY_CHAPTER_STARTS: { index: number; chapter: string }[] = (() => {
  const seen = new Set<string>();
  const out: { index: number; chapter: string }[] = [];
  STORY_SLIDES.forEach((s, idx) => {
    if (!seen.has(s.chapter)) {
      seen.add(s.chapter);
      out.push({ index: idx, chapter: s.chapter });
    }
  });
  return out;
})();
