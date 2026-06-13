// PDF.js 워커 세팅
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Supabase URL 정제 헬퍼 (프로토콜 자동 추가 및 호스트 추출)
function getSanitizedSupabaseUrl(url) {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }
  try {
    const parsed = new URL(cleanUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    return cleanUrl.replace(/\/functions\/v1\/gemini-proxy\/?$/i, '')
                   .replace(/\/functions\/v1\/?$/i, '')
                   .replace(/\/functions\/?$/i, '')
                   .replace(/\/$/, '');
  }
}

// Supabase 설정 로드 헬퍼 (기본 접속 정보와 localStorage 복합 로드)
function getStoredSupabaseConfig() {
  const defaultUrl = 'https://uncffkzyvaapanixvniy.supabase.co';
  const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuY2Zma3p5dmFhcGFuaXh2bml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjgwOTYsImV4cCI6MjA5NjQwNDA5Nn0.CT_vKSjcpSmtFQ3KIUesHIAdyyq5HfOsGq1VKNsfRiY';
  
  const rawUrl = localStorage.getItem('selqu_supabase_url') || defaultUrl;
  const url = getSanitizedSupabaseUrl(rawUrl);
  const anonKeyRaw = localStorage.getItem('selqu_supabase_anon_key') || '';
  let anonKey = '';
  
  if (anonKeyRaw) {
    try {
      anonKey = atob(anonKeyRaw);
    } catch (e) {
      anonKey = anonKeyRaw;
    }
  } else {
    anonKey = defaultAnonKey;
  }
  
  return { url, anonKey };
}

// 애플리케이션 상태 관리 객체
const supabaseConfig = getStoredSupabaseConfig();
let storedModel = localStorage.getItem('selqu_api_model') || 'gemini-2.5-flash';
if (storedModel === 'gemini-1.5-flash') {
  storedModel = 'gemini-2.5-flash';
  localStorage.setItem('selqu_api_model', 'gemini-2.5-flash');
} else if (storedModel === 'gemini-1.5-pro') {
  storedModel = 'gemini-2.5-pro';
  localStorage.setItem('selqu_api_model', 'gemini-2.5-pro');
}

const state = {
  supabaseUrl: supabaseConfig.url,
  supabaseAnonKey: supabaseConfig.anonKey,
  theme: localStorage.getItem('selqu_theme') || 'light',
  
  // 퀴즈 관련 데이터
  currentFiles: [],
  imageParts: [],
  extractedText: '',
  questions: [],
  userAnswers: [], // { questionId, selectedAnswer, isCorrect, forcedCorrect }
  currentQuestionIndex: 0,
  
  // 퀴즈 생성 설정
  config: {
    questionCount: 3,
    difficulty: 'medium',
    types: ['mcq', 'tf', 'short'],
    language: 'ko',
    model: storedModel
  },
  
  // 학습 내역
  history: JSON.parse(localStorage.getItem('selqu_history') || '[]')
};

// DOM 요소 캐싱
const DOM = {
  html: document.documentElement,
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeToggleIcon: document.getElementById('themeToggleIcon'),
  
  openSidebarBtn: document.getElementById('openSidebarBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  historySidebar: document.getElementById('historySidebar'),
  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  emptyHistory: document.getElementById('emptyHistory'),
  
  apiSettingsBtn: document.getElementById('apiSettingsBtn'),
  apiStatusDot: document.getElementById('apiStatusDot'),
  apiStatusText: document.getElementById('apiStatusText'),
  apiModal: document.getElementById('apiModal'),
  apiModalOverlay: document.getElementById('apiModalOverlay'),
  apiModalCard: document.getElementById('apiModalCard'),
  closeApiModalBtn: document.getElementById('closeApiModalBtn'),
  supabaseUrlInput: document.getElementById('supabaseUrlInput'),
  supabaseAnonKeyInput: document.getElementById('supabaseAnonKeyInput'),
  toggleApiKeyVisibility: document.getElementById('toggleApiKeyVisibility'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
  apiModelSelect: document.getElementById('apiModelSelect'),
  
  tabUpload: document.getElementById('tabUpload'),
  tabTextInput: document.getElementById('tabTextInput'),
  uploadContainer: document.getElementById('uploadContainer'),
  textInputContainer: document.getElementById('textInputContainer'),
  
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('fileInput'),
  fileInfoBox: document.getElementById('fileInfoBox'),
  fileName: document.getElementById('fileName'),
  fileIcon: document.getElementById('fileIcon'),
  removeFileBtn: document.getElementById('removeFileBtn'),
  directText: document.getElementById('directText'),
  parsedTextPreviewBox: document.getElementById('parsedTextPreviewBox'),
  parsedText: document.getElementById('parsedText'),
  charCount: document.getElementById('charCount'),
  
  generateQuizBtn: document.getElementById('generateQuizBtn'),
  quizConceptInput: document.getElementById('quizConceptInput'),
  
  // 퀴즈 뷰 상태
  quizIdleState: document.getElementById('quizIdleState'),
  quizActiveState: document.getElementById('quizActiveState'),
  quizResultState: document.getElementById('quizResultState'),
  
  // 퀴즈 진행 제어
  quizProgressText: document.getElementById('quizProgressText'),
  quizProgressBar: document.getElementById('quizProgressBar'),
  questionCard: document.getElementById('questionCard'),
  questionTypeBadge: document.getElementById('questionTypeBadge'),
  questionNumber: document.getElementById('questionNumber'),
  questionText: document.getElementById('questionText'),
  answerOptionsContainer: document.getElementById('answerOptionsContainer'),
  shortAnswerContainer: document.getElementById('shortAnswerContainer'),
  shortAnswerInput: document.getElementById('shortAnswerInput'),
  submitShortAnswerBtn: document.getElementById('submitShortAnswerBtn'),
  explanationCard: document.getElementById('explanationCard'),
  explanationIcon: document.getElementById('explanationIcon'),
  explanationResultText: document.getElementById('explanationResultText'),
  explanationCorrectAns: document.getElementById('explanationCorrectAns'),
  explanationText: document.getElementById('explanationText'),
  
  prevQuestionBtn: document.getElementById('prevQuestionBtn'),
  nextQuestionBtn: document.getElementById('nextQuestionBtn'),
  
  // 결과 화면
  resultGradeText: document.getElementById('resultGradeText'),
  resultScore: document.getElementById('resultScore'),
  resultCount: document.getElementById('resultCount'),
  retryQuizBtn: document.getElementById('retryQuizBtn'),
  newQuizBtn: document.getElementById('newQuizBtn'),
  quizReviewList: document.getElementById('quizReviewList'),
  
  // 전면 광고 모형
  adOverlay: document.getElementById('adOverlay'),
  skipAdBtn: document.getElementById('skipAdBtn'),
  adCountdown: document.getElementById('adCountdown'),
  
  // 퀵 이동 문항 번호 맵
  quizQuestionMap: document.getElementById('quizQuestionMap')
};

// ----------------------------------------------------
// 1. 초기 실행 및 설정 관리
// ----------------------------------------------------
function init() {
  initTheme();
  updateApiStatusIndicator();
  renderHistoryList();
  setupEventListeners();
  initConfigButtons();
  loadActiveQuizState();
}

// 테마 초기화
function initTheme() {
  if (state.theme === 'dark') {
    DOM.html.classList.add('dark');
    DOM.themeToggleIcon.className = 'fa-solid fa-sun';
  } else {
    DOM.html.classList.remove('dark');
    DOM.themeToggleIcon.className = 'fa-solid fa-moon';
  }
  DOM.html.setAttribute('data-theme', state.theme);
}

// API (Supabase 프록시) 상태 표시 업데이트
function updateApiStatusIndicator() {
  if (state.supabaseUrl && state.supabaseAnonKey) {
    DOM.apiStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
    DOM.apiStatusText.innerText = 'Supabase 연결됨';
    if (DOM.supabaseUrlInput) DOM.supabaseUrlInput.value = state.supabaseUrl;
    if (DOM.supabaseAnonKeyInput) DOM.supabaseAnonKeyInput.value = state.supabaseAnonKey;
  } else {
    DOM.apiStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    DOM.apiStatusText.innerText = 'Supabase 설정 필요';
    if (DOM.supabaseUrlInput) DOM.supabaseUrlInput.value = '';
    if (DOM.supabaseAnonKeyInput) DOM.supabaseAnonKeyInput.value = '';
  }
  if (DOM.apiModelSelect) {
    DOM.apiModelSelect.value = state.config.model;
  }
}

// 설정 값 버튼 매핑 초기화
function initConfigButtons() {
  // 문제수 설정 버튼 리스너
  document.querySelectorAll('.quiz-config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quiz-config-btn').forEach(b => b.classList.remove('active-config'));
      btn.classList.add('active-config');
      state.config.questionCount = parseInt(btn.getAttribute('data-value'));
    });
  });

  // 난이도 설정 버튼 리스너
  document.querySelectorAll('.difficulty-config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.difficulty-config-btn').forEach(b => b.classList.remove('active-config'));
      btn.classList.add('active-config');
      state.config.difficulty = btn.getAttribute('data-difficulty');
    });
  });

  // 문제 유형 설정 버튼 리스너 (다중선택)
  document.querySelectorAll('.type-config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      if (btn.classList.contains('active-config')) {
        // 최소 1개는 선택되어 있어야 함
        const activeTypesCount = document.querySelectorAll('.type-config-btn.active-config').length;
        if (activeTypesCount > 1) {
          btn.classList.remove('active-config');
          state.config.types = state.config.types.filter(t => t !== type);
        } else {
          alert('최소 한 개 이상의 문제 유형을 선택해야 합니다.');
        }
      } else {
        btn.classList.add('active-config');
        state.config.types.push(type);
      }
    });
  });
}

// ----------------------------------------------------
// 2. 이벤트 리스너 세팅
// ----------------------------------------------------
function setupEventListeners() {
  // 테마 전환 버튼
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);
  
  // 모바일 메뉴 사이드바 제어
  DOM.openSidebarBtn.addEventListener('click', () => sidebarToggle(true));
  DOM.closeSidebarBtn.addEventListener('click', () => sidebarToggle(false));
  DOM.sidebarOverlay.addEventListener('click', () => sidebarToggle(false));
  
  // 히스토리 전체삭제
  DOM.clearHistoryBtn.addEventListener('click', clearHistory);
  
  // API 설정 모달 열기/닫기
  DOM.apiSettingsBtn.addEventListener('click', () => toggleApiModal(true));
  DOM.closeApiModalBtn.addEventListener('click', () => toggleApiModal(false));
  DOM.apiModalOverlay.addEventListener('click', () => toggleApiModal(false));
  DOM.toggleApiKeyVisibility.addEventListener('click', toggleApiKeyVisibility);
  DOM.saveApiKeyBtn.addEventListener('click', saveApiKey);
  
  // API 설정 입력 이벤트 리스너 및 엔터키 등록
  DOM.supabaseUrlInput.addEventListener('input', () => {
    state.supabaseUrl = DOM.supabaseUrlInput.value.trim();
    if (state.supabaseUrl) {
      localStorage.setItem('selqu_supabase_url', state.supabaseUrl);
    } else {
      localStorage.removeItem('selqu_supabase_url');
    }
    updateApiStatusIndicator();
  });

  DOM.supabaseAnonKeyInput.addEventListener('input', () => {
    const val = DOM.supabaseAnonKeyInput.value.trim();
    state.supabaseAnonKey = val;
    if (val) {
      localStorage.setItem('selqu_supabase_anon_key', btoa(val));
    } else {
      localStorage.removeItem('selqu_supabase_anon_key');
    }
    updateApiStatusIndicator();
  });
  
  DOM.supabaseAnonKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveApiKey();
    }
  });

  DOM.supabaseUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveApiKey();
    }
  });
  
  // 업로드 소스 탭 전환
  DOM.tabUpload.addEventListener('click', () => switchUploadTab('upload'));
  DOM.tabTextInput.addEventListener('click', () => switchUploadTab('text'));
  
  // 파일 드롭존 및 인풋
  DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());
  DOM.dropzone.addEventListener('dragover', onDragOver);
  DOM.dropzone.addEventListener('dragleave', onDragLeave);
  DOM.dropzone.addEventListener('drop', onDrop);
  DOM.fileInput.addEventListener('change', onFileSelect);
  DOM.removeFileBtn.addEventListener('click', removeFile);
  
  // 직접 텍스트 입력 글자 수 체크
  DOM.directText.addEventListener('input', handleDirectTextInput);
  DOM.parsedText.addEventListener('input', () => {
    state.extractedText = DOM.parsedText.value;
    DOM.charCount.innerText = `${state.extractedText.length}자`;
  });
  
  // 생성 및 퀴즈 제어
  DOM.generateQuizBtn.addEventListener('click', startQuizGenerationProcess);
  DOM.prevQuestionBtn.addEventListener('click', () => navigateQuestion(-1));
  DOM.nextQuestionBtn.addEventListener('click', () => navigateQuestion(1));
  DOM.retryQuizBtn.addEventListener('click', retryQuiz);
  DOM.newQuizBtn.addEventListener('click', resetToNewQuiz);
  
  // 단답형 주관식 실시간 답안 저장 및 엔터키 입력 시 다음 문항 이동
  DOM.shortAnswerInput.addEventListener('input', () => {
    const val = DOM.shortAnswerInput.value.trim();
    state.userAnswers[state.currentQuestionIndex].selectedAnswer = val || null;
    renderQuestionMap();
    saveActiveQuizState();
  });
  DOM.shortAnswerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateQuestion(1);
    }
  });
}

// ----------------------------------------------------
// 3. UI 및 상태 제어 함수들
// ----------------------------------------------------
function toggleTheme() {
  if (DOM.html.classList.contains('dark')) {
    DOM.html.classList.remove('dark');
    state.theme = 'light';
    DOM.themeToggleIcon.className = 'fa-solid fa-moon';
  } else {
    DOM.html.classList.add('dark');
    state.theme = 'dark';
    DOM.themeToggleIcon.className = 'fa-solid fa-sun';
  }
  localStorage.setItem('selqu_theme', state.theme);
  DOM.html.setAttribute('data-theme', state.theme);
}

function sidebarToggle(isOpen) {
  if (isOpen) {
    DOM.historySidebar.classList.remove('-translate-x-full');
    DOM.sidebarOverlay.classList.remove('hidden');
  } else {
    DOM.historySidebar.classList.add('-translate-x-full');
    DOM.sidebarOverlay.classList.add('hidden');
  }
}

// API 키 모달 제어
function toggleApiModal(isOpen) {
  if (isOpen) {
    DOM.apiModal.classList.remove('hidden');
    setTimeout(() => {
      DOM.apiModalCard.classList.add('modal-active');
    }, 10);
  } else {
    DOM.apiModalCard.classList.remove('modal-active');
    setTimeout(() => {
      DOM.apiModal.classList.add('hidden');
    }, 300);
  }
}

function toggleApiKeyVisibility() {
  const icon = DOM.toggleApiKeyVisibility.querySelector('i');
  if (DOM.supabaseAnonKeyInput.type === 'password') {
    DOM.supabaseAnonKeyInput.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    DOM.supabaseAnonKeyInput.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
}

function saveApiKey() {
  let newUrl = DOM.supabaseUrlInput.value.trim();
  const newAnonKey = DOM.supabaseAnonKeyInput.value.trim();
  const newModel = DOM.apiModelSelect.value;
  
  if (!newUrl || !newAnonKey) {
    alert('Supabase Project URL과 Anon Key를 모두 입력해주세요.');
    return;
  }
  
  newUrl = getSanitizedSupabaseUrl(newUrl);
  state.supabaseUrl = newUrl;
  state.supabaseAnonKey = newAnonKey;
  
  localStorage.setItem('selqu_supabase_url', newUrl);
  localStorage.setItem('selqu_supabase_anon_key', btoa(newAnonKey));
  
  state.config.model = newModel;
  localStorage.setItem('selqu_api_model', newModel);
  
  DOM.supabaseUrlInput.value = newUrl;
  
  updateApiStatusIndicator();
  toggleApiModal(false);
}

function switchUploadTab(type) {
  if (type === 'upload') {
    DOM.tabUpload.className = 'flex-1 pb-2 font-semibold text-sm border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400';
    DOM.tabTextInput.className = 'flex-1 pb-2 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300';
    DOM.uploadContainer.classList.remove('hidden');
    DOM.textInputContainer.classList.add('hidden');
    
    // 파일 업로드 데이터가 있다면 프리뷰 복원
    if (state.extractedText && state.currentFile) {
      DOM.parsedTextPreviewBox.classList.remove('hidden');
    } else {
      DOM.parsedTextPreviewBox.classList.add('hidden');
    }
  } else {
    DOM.tabTextInput.className = 'flex-1 pb-2 font-semibold text-sm border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400';
    DOM.tabUpload.className = 'flex-1 pb-2 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300';
    DOM.textInputContainer.classList.remove('hidden');
    DOM.uploadContainer.classList.add('hidden');
    DOM.parsedTextPreviewBox.classList.add('hidden'); // 직접 입력은 굳이 미리보기 노출 안 함
    state.extractedText = DOM.directText.value;
  }
}

// ----------------------------------------------------
// 4. 드롭존 및 파일 파싱 처리 로직
// ----------------------------------------------------
function onDragOver(e) {
  e.preventDefault();
  DOM.dropzone.classList.add('border-indigo-500', 'bg-indigo-50/20', 'dark:bg-indigo-950/20');
}

function onDragLeave(e) {
  e.preventDefault();
  DOM.dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/20', 'dark:bg-indigo-950/20');
}

function onDrop(e) {
  e.preventDefault();
  DOM.dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/20', 'dark:bg-indigo-950/20');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFiles(files);
  }
}

function onFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFiles(files);
  }
}

function removeFile() {
  state.currentFiles = [];
  state.imageParts = [];
  state.extractedText = '';
  DOM.fileInput.value = '';
  DOM.fileInfoBox.classList.add('hidden');
  DOM.parsedTextPreviewBox.classList.add('hidden');
  DOM.dropzone.classList.remove('hidden');
  clearActiveQuizState();
}

function handleDirectTextInput() {
  state.extractedText = DOM.directText.value;
}

// 파일 종류 감지 및 파싱 엔진 호출 (복수 파일 지원)
async function handleFiles(filesList) {
  const files = Array.from(filesList);
  if (files.length === 0) return;

  // 개별 용량 및 총 용량 검증
  const MAX_PDF_EXCEL_SIZE = 30 * 1024 * 1024; // 30MB
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;     // 10MB
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024;     // 50MB

  let totalSize = 0;
  for (const file of files) {
    totalSize += file.size;
    
    if (file.type.startsWith('image/')) {
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`이미지 파일 '${file.name}'의 용량이 너무 큽니다. 최대 10MB 이하의 이미지 파일만 업로드할 수 있습니다.`);
        DOM.fileInput.value = '';
        return;
      }
    } else {
      if (file.size > MAX_PDF_EXCEL_SIZE) {
        alert(`문서 파일 '${file.name}'의 용량이 너무 큽니다. 최대 30MB 이하의 파일만 업로드할 수 있습니다.`);
        DOM.fileInput.value = '';
        return;
      }
    }
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    alert(`선택한 전체 파일의 합산 용량이 너무 큽니다 (현재 ${(totalSize / (1024 * 1024)).toFixed(1)}MB). 전체 합산 용량은 최대 50MB 이하여야 합니다.`);
    DOM.fileInput.value = '';
    return;
  }

  // 로딩 상태 표시
  DOM.parsedTextPreviewBox.classList.remove('hidden');
  DOM.parsedText.value = '문서들을 해석하고 텍스트를 추출하는 중입니다...';
  DOM.charCount.innerText = '0자';
  DOM.dropzone.classList.add('hidden');
  DOM.fileInfoBox.classList.remove('hidden');

  // 파일 목록 표시 업데이트
  if (files.length === 1) {
    DOM.fileName.innerText = files[0].name;
    let iconClass = 'fa-solid fa-file';
    if (files[0].type.startsWith('image/')) iconClass = 'fa-solid fa-file-image';
    else if (files[0].name.endsWith('.pdf')) iconClass = 'fa-solid fa-file-pdf';
    else if (files[0].name.endsWith('.xlsx') || files[0].name.endsWith('.xls')) iconClass = 'fa-solid fa-file-excel';
    else if (files[0].name.endsWith('.txt')) iconClass = 'fa-solid fa-file-lines';
    DOM.fileIcon.className = `${iconClass} text-indigo-500 flex-shrink-0`;
  } else {
    DOM.fileName.innerText = `${files[0].name} 외 ${files.length - 1}개 파일`;
    DOM.fileIcon.className = 'fa-solid fa-folder-open text-indigo-500 flex-shrink-0';
  }

  state.currentFiles = files;
  state.imageParts = [];
  let combinedText = '';

  try {
    for (const file of files) {
      combinedText += `\n[파일명: ${file.name}]\n`;
      if (file.type.startsWith('image/')) {
        const base64DataUrl = await fileToBase64(file);
        const base64Raw = base64DataUrl.split(',')[1];
        state.imageParts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Raw
          }
        });
        combinedText += `[이미지 감지됨: OCR 파싱 및 퀴즈 출제는 Gemini가 직접 수행합니다.]\n`;
      } else if (file.name.endsWith('.pdf')) {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const pdfText = await extractTextFromPdf(arrayBuffer);
        combinedText += pdfText + '\n';
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const excelText = extractTextFromExcel(arrayBuffer);
        combinedText += excelText + '\n';
      } else {
        const txtText = await readFileAsText(file);
        combinedText += txtText + '\n';
      }
    }
    
    state.extractedText = combinedText.trim();
    DOM.parsedText.value = state.extractedText;
    DOM.charCount.innerText = `${state.extractedText.length}자`;
    
    saveActiveQuizState();
  } catch (err) {
    console.error(err);
    DOM.parsedText.value = `텍스트를 추출하는데 실패했습니다. 에러: ${err.message}`;
    state.extractedText = '';
  }
}

// FileReader Helper 함수들
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// PDF 텍스트 추출 로직 (PDF.js)
async function extractTextFromPdf(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 10); // 최대 10페이지 제한 (과도한 텍스트 방지)
  
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  if (pdf.numPages > 10) {
    fullText += `\n[알림: 문서가 너무 길어 10페이지까지만 파싱되었습니다.]`;
  }
  return fullText;
}

// Excel 텍스트 추출 로직 (SheetJS)
function extractTextFromExcel(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  let fullText = '';
  
  // 첫 3개 시트까지만 추출
  const sheetNames = workbook.SheetNames.slice(0, 3);
  sheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    // CSV로 변환
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    fullText += `[시트명: ${sheetName}]\n${csv}\n\n`;
  });
  
  return fullText;
}

// 이미지를 Base64 구조로 로드하기
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// ----------------------------------------------------
// 5. 전면 광고 모형 연출 제어
// ----------------------------------------------------
// 전역 설정: 테스트 중 광고 비활성화 플래그 (true이면 광고를 보지 않고 즉시 로딩하며, false이면 병렬로 광고를 봄)
const IS_AD_ENABLED = false;

// 병렬 처리를 위한 임시 상태 변수
let isQuizGenerated = false;
let isAdFinished = false;
let quizGenerationError = null;

// ----------------------------------------------------
// 5. 전면 광고 모형 연출 제어
// ----------------------------------------------------
function startQuizGenerationProcess() {
  // 입력 검증
  if (!state.supabaseUrl || !state.supabaseAnonKey) {
    alert('퀴즈를 생성하려면 상단 설정에서 Supabase 프록시 정보를 등록해야 합니다.');
    toggleApiModal(true);
    return;
  }
  
  if (!state.extractedText.trim()) {
    alert('학습을 위해 파일 업로드 또는 직접 텍스트 입력을 통해 본문 내용을 제공해주세요.');
    return;
  }

  // 5,000자 초과 시 자동 경고 및 자르기
  if (state.extractedText.length > 5000) {
    alert(`입력된 본문 내용이 너무 깁니다(현재 ${state.extractedText.length.toLocaleString()}자). 무료 AI 모델의 한계로 인해 앞부분 5,000자만 사용하여 퀴즈를 생성합니다.`);
    state.extractedText = state.extractedText.substring(0, 5000);
    if (DOM.parsedText) {
      DOM.parsedText.value = state.extractedText;
    }
    if (DOM.charCount) {
      DOM.charCount.innerText = `${state.extractedText.length}자`;
    }
  }

  // 생성 시작 버튼 로딩 처리
  DOM.generateQuizBtn.disabled = true;
  DOM.generateQuizBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> 문제 생성 요청 중...`;

  // 상태 초기화
  isQuizGenerated = false;
  isAdFinished = false;
  quizGenerationError = null;

  // 1. AI 기반 문제 생성 비동기 호출 (병렬 실행)
  executeQuizGenerationParallel();

  // 2. 광고 시뮬레이션 제어 (병렬 실행)
  if (!IS_AD_ENABLED) {
    isAdFinished = true;
    checkParallelCompletion();
  } else {
    showInterstitialAd(() => {
      isAdFinished = true;
      checkParallelCompletion();
    });
  }
}

function showInterstitialAd(onAdClosed) {
  DOM.adOverlay.classList.remove('hidden');
  DOM.skipAdBtn.disabled = true;
  DOM.skipAdBtn.className = "px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed";
  
  let countdown = 5;
  DOM.adCountdown.innerText = `광고 건너뛰기 ${countdown}`;
  
  const timer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      DOM.adCountdown.innerText = `광고 건너뛰기 ${countdown}`;
    } else {
      clearInterval(timer);
      DOM.adCountdown.innerHTML = `건너뛰기 <i class="fa-solid fa-chevron-right"></i>`;
      DOM.skipAdBtn.disabled = false;
      DOM.skipAdBtn.className = "px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow shadow-indigo-600/30";
    }
  }, 1000);
  
  // 스킵 클릭 이벤트 설정
  DOM.skipAdBtn.onclick = () => {
    DOM.adOverlay.classList.add('hidden');
    onAdClosed();
  };
}

function checkParallelCompletion() {
  // AI 생성과 광고 종료가 모두 완료되었을 때만 처리
  if (isQuizGenerated && isAdFinished) {
    // 생성 버튼 복구
    DOM.generateQuizBtn.disabled = false;
    DOM.generateQuizBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>퀴즈 생성하기</span>`;
    DOM.adOverlay.classList.add('hidden'); // 광고 창 강제 숨김

    if (quizGenerationError) {
      console.error('퀴즈 생성 중 오류 발생:', quizGenerationError);
      alert(`퀴즈 생성에 실패했습니다: ${quizGenerationError.message}`);
      return;
    }

    // 화면 전환
    DOM.quizIdleState.classList.add('hidden');
    DOM.quizResultState.classList.add('hidden');
    DOM.quizActiveState.classList.remove('hidden');

    // 첫 문제 렌더링
    renderQuestion(0);
    saveActiveQuizState();
  }
}

// ----------------------------------------------------
// 6. Gemini API 연동 및 데이터 생성
// ----------------------------------------------------
async function executeQuizGeneration() {
  const concept = DOM.quizConceptInput ? DOM.quizConceptInput.value.trim() : '';

  // 시스템 프롬프트 및 응답 스키마 지시문
  const promptText = `너는 전문 시험 출제 위원(Quiz Maker)이다. 아래 본문 텍스트 또는 이미지를 기반으로 퀴즈를 생성하라.
반드시 아래 지침을 준수해야 한다:
1. 언어: ${state.config.language === 'ko' ? '한국어' : '영어'}
2. 문항 수: 총 ${state.config.questionCount}개 문항
3. 난이도: ${state.config.difficulty === 'easy' ? '쉬움(초급)' : state.config.difficulty === 'hard' ? '어려움(고급)' : '보통(중급)'}
4. 허용된 문제 유형: [${state.config.types.join(', ')}]
   - 'mcq' (객관식 4지선다): 'options' 배열에 정확히 4개의 보기를 제공하고, 'correctAnswer'는 4개 보기 중 하나인 정답 텍스트와 정확히 일치해야 함.
   - 'tf' (OX 퀴즈): 'options'는 빈 배열 '[]'이어야 하고, 'correctAnswer'는 오직 'O' 또는 'X' 문자만 기재해야 함.
   - 'short' (주관식 단답형): 'options'는 빈 배열 '[]'이어야 하고, 'correctAnswer'는 핵심 정답 단어 또는 숫자 구문으로 기재해야 함. (서술형은 출제 금지)
5. 출제 범위 제한 (Strict Grounding / NotebookLM 스타일):
   - **반드시 제공된 [본문 내용] 내에 명시적으로 언급된 사실, 정보, 데이터만을 바탕으로 문제를 출제**해야 합니다.
   - 본문에 직접 언급되지 않은 외부 지식, 역사적 사실, 유추 정보, 또는 단순 상식에만 의존해서 맞춰야 하는 문제는 절대 출제하지 마십시오.
   - 예컨대 본문이 애국가 가사라면, 본문 텍스트 자체를 카운트하여 '1절의 총 글자 수는 몇 자인가?'를 묻거나 본문에 나오는 특정 단어('백두산', '철갑' 등)에 관한 사실 일치 여부만 질문할 수 있습니다. 
${concept ? `6. 특별 출제 컨셉 및 지시사항:
   - **사용자가 요청한 출제 요구사항: "${concept}"**
   - 이 지시사항에 맞춰 문제의 출제 방식, 스타일, 톤앤매너를 유연하게 가공하십시오. (예: '넌센스로 내줘'인 경우 본문 범위 내에서 창의적이고 재미있는 말장난으로, '빈칸 채우기 형태로 내줘'인 경우 주요 키워드 위치를 빈칸으로 비운 문제 문장을 생성하는 등)` : ''}

반드시 아래 JSON 스키마 형식으로만 응답해야 하며, 마크업이나 코드블럭 없이 오직 순수한 JSON 데이터 구조만 출력해야 한다:
{
  "questions": [
    {
      "id": 문항 번호 (1부터 시작하는 정수),
      "type": "mcq" 또는 "tf" 또는 "short",
      "question": "출제할 문제 문항 텍스트",
      "options": ["보기1", "보기2", "보기3", "보기4"] (mcq가 아니면 빈 배열 []),
      "correctAnswer": "정답 텍스트 (mcq인 경우 options 중 하나와 완벽히 일치해야 하며, tf인 경우 'O' 또는 'X', short인 경우 정확한 핵심 정답 구문)",
      "explanation": "해설 내용"
    }
  ]
}

[본문 내용]:
${state.extractedText}
`;

  const parts = [{ text: promptText }];
  if (state.imageParts && state.imageParts.length > 0) {
    state.imageParts.forEach(part => parts.push(part));
  }

  const requestBody = {
    model: state.config.model,
    contents: [{
      parts: parts
    }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  if (!state.supabaseUrl || !state.supabaseAnonKey) {
    throw new Error('Supabase 프록시 설정이 되어 있지 않습니다. 설정(톱니바퀴 아이콘)에서 정보를 입력해주세요.');
  }

  const baseUrl = getSanitizedSupabaseUrl(state.supabaseUrl);
  const url = `${baseUrl}/functions/v1/gemini-proxy`;
  console.log("Requesting Supabase Function URL:", url);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.supabaseAnonKey.trim()}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`API 통신 에러 (코드: ${response.status})`);
  }

  const resData = await response.json();
  const responseText = resData.candidates[0].content.parts[0].text;
  const generatedData = parseCleanJSON(responseText);

  if (!generatedData.questions || !Array.isArray(generatedData.questions)) {
    throw new Error('올바른 퀴즈 데이터 구조가 아닙니다.');
  }

  // 상태 업데이트
  state.questions = generatedData.questions;
  state.userAnswers = state.questions.map(q => ({
    questionId: q.id,
    selectedAnswer: null,
    isCorrect: false,
    forcedCorrect: false
  }));
  state.currentQuestionIndex = 0;
}

async function executeQuizGenerationParallel() {
  try {
    await executeQuizGeneration();
    isQuizGenerated = true;
  } catch (err) {
    quizGenerationError = err;
    isQuizGenerated = true;
  } finally {
    checkParallelCompletion();
  }
}

// ----------------------------------------------------
// 7. 퀴즈 진행 및 화면 제어
// ----------------------------------------------------
function renderQuestion(index) {
  if (index < 0 || index >= state.questions.length) return;
  state.currentQuestionIndex = index;
  
  const question = state.questions[index];
  const userAnswer = state.userAnswers[index];
  
  // 이전/다음 버튼 제어
  DOM.prevQuestionBtn.disabled = index === 0;
  DOM.nextQuestionBtn.innerText = index === state.questions.length - 1 ? '최종 제출하여 채점하기' : '다음 문제';

  // 헤더 및 프로그레스 바 제어
  DOM.quizProgressText.innerText = `${index + 1} / ${state.questions.length} 문제`;
  const percent = ((index + 1) / state.questions.length) * 100;
  DOM.quizProgressBar.style.width = `${percent}%`;

  // 퀵 이동 문항 지도 렌더링
  renderQuestionMap();

  // 문제 카드 내용 바인딩
  DOM.questionNumber.innerText = `QUESTION 0${index + 1}`;
  DOM.questionTypeBadge.innerText = question.type === 'mcq' ? '객관식' : question.type === 'tf' ? 'OX 퀴즈' : '단답형';
  DOM.questionText.innerText = question.question;

  // 정답 폼 노출 분기 및 해설 숨김
  DOM.answerOptionsContainer.innerHTML = '';
  DOM.shortAnswerContainer.classList.add('hidden');
  DOM.explanationCard.classList.add('hidden');
  DOM.shortAnswerInput.value = '';

  if (question.type === 'mcq') {
    // 4지선다형 보기 렌더링
    question.options.forEach((opt, idx) => {
      const optLetter = String.fromCharCode(65 + idx); // A, B, C, D
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="option-badge">${optLetter}</span> <span class="option-text">${opt}</span>`;
      
      // 이미 답변을 선택해 둔 상태인 경우 하이라이트 스타일 복원
      if (userAnswer.selectedAnswer === opt) {
        btn.classList.add('active-config');
      }
      
      btn.addEventListener('click', () => submitMultipleChoiceAnswer(opt, btn));
      DOM.answerOptionsContainer.appendChild(btn);
    });
  } else if (question.type === 'tf') {
    // OX 퀴즈 렌더링
    ['O', 'X'].forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn justify-center font-bold text-lg';
      btn.innerHTML = `<span class="option-text text-xl">${opt}</span>`;
      
      // 이미 답변을 선택해 둔 상태인 경우 하이라이트 스타일 복원
      if (userAnswer.selectedAnswer === opt) {
        btn.classList.add('active-config');
      }
      
      btn.addEventListener('click', () => submitMultipleChoiceAnswer(opt, btn));
      DOM.answerOptionsContainer.appendChild(btn);
    });
  } else if (question.type === 'short') {
    // 주관식 단답형 노출
    DOM.shortAnswerContainer.classList.remove('hidden');
    DOM.shortAnswerInput.disabled = false;
    DOM.submitShortAnswerBtn.classList.add('hidden'); // 실시간 저장이므로 단일 제출 버튼은 제거(숨김)
    
    if (userAnswer.selectedAnswer !== null) {
      DOM.shortAnswerInput.value = userAnswer.selectedAnswer;
    }
  }
}

// 퀵 이동 문항 번호 지도 그리기
function renderQuestionMap() {
  if (!DOM.quizQuestionMap) return;
  DOM.quizQuestionMap.innerHTML = '';
  
  state.questions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isCurrent = idx === state.currentQuestionIndex;
    const isAnswered = state.userAnswers[idx] && state.userAnswers[idx].selectedAnswer !== null && state.userAnswers[idx].selectedAnswer !== '';
    
    let btnClass = 'w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold transition-all ';
    if (isCurrent) {
      btnClass += 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/20';
    } else if (isAnswered) {
      btnClass += 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400 font-extrabold';
    } else {
      btnClass += 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500';
    }
    
    btn.className = btnClass;
    btn.innerText = idx + 1;
    btn.addEventListener('click', () => {
      renderQuestion(idx);
    });
    DOM.quizQuestionMap.appendChild(btn);
  });
}

// 객관식 및 OX 선택 시 답안 저장 및 하이라이트
function submitMultipleChoiceAnswer(selectedOpt, clickedBtn) {
  const currentIdx = state.currentQuestionIndex;
  
  // 상태 업데이트
  state.userAnswers[currentIdx].selectedAnswer = selectedOpt;

  // 전체 보기 하이라이트 제거 후 클릭한 보기에만 파란색 테두리 적용
  const buttons = DOM.answerOptionsContainer.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active-config');
  });
  clickedBtn.classList.add('active-config');

  // 문항 지도 번호판 상태 새로고침
  renderQuestionMap();
  saveActiveQuizState();
}

// 주관식 단답형 답변 제출 (사용하지 않음 - 자동 실시간 저장으로 대체)
function submitShortAnswer() {
  // 하위 호환 및 에러 방지용 빈 함수로 유지
}

// 실시간 해설 패널 열기 (리포트용으로만 사용됨)
function showExplanation(isCorrect, correctAnswer, explanationText) {
  DOM.explanationCard.classList.remove('hidden', 'border-emerald-200', 'bg-emerald-50/30', 'dark:border-emerald-900/30', 'dark:bg-emerald-950/20', 'border-rose-200', 'bg-rose-50/30', 'dark:border-rose-900/30', 'dark:bg-rose-950/20');
  
  if (isCorrect) {
    DOM.explanationCard.classList.add('border-emerald-200', 'bg-emerald-50/30', 'dark:border-emerald-900/30', 'dark:bg-emerald-950/20');
    DOM.explanationIcon.className = 'fa-solid fa-circle-check text-emerald-500';
    DOM.explanationResultText.innerText = '정답입니다!';
    DOM.explanationResultText.className = 'text-emerald-600 dark:text-emerald-400 font-bold';
  } else {
    DOM.explanationCard.classList.add('border-rose-200', 'bg-rose-50/30', 'dark:border-rose-900/30', 'dark:bg-rose-950/20');
    DOM.explanationIcon.className = 'fa-solid fa-circle-xmark text-rose-500';
    DOM.explanationResultText.innerText = '아쉽게도 틀렸습니다.';
    DOM.explanationResultText.className = 'text-rose-600 dark:text-rose-400 font-bold';
  }

  DOM.explanationCorrectAns.innerText = correctAnswer;
  DOM.explanationText.innerText = explanationText || '상세 해설이 없습니다.';
}

// 퀴즈 문제 간 이동 및 최종 채점 리포트 연출
function navigateQuestion(direction) {
  const newIndex = state.currentQuestionIndex + direction;
  
  if (newIndex >= 0 && newIndex < state.questions.length) {
    renderQuestion(newIndex);
    saveActiveQuizState();
  } else if (newIndex >= state.questions.length) {
    // 모든 문항 완료 확인
    const unansweredIdx = state.userAnswers.findIndex(ans => ans.selectedAnswer === null || String(ans.selectedAnswer).trim() === '');
    if (unansweredIdx !== -1) {
      alert(`아직 풀지 않은 문제가 있습니다. ${unansweredIdx + 1}번 문제로 이동하여 풀어주세요.`);
      renderQuestion(unansweredIdx);
      return;
    }
    
    // 최종 성적표로 이동하기 전 채점 전면 광고 띄우기
    showInterstitialAd(() => {
      executeQuizGradingAndRenderResults();
    });
  }
}

// ----------------------------------------------------
// 7.5 AI 기반 일괄 채점 로직 (주관식 자동 판정 포함)
// ----------------------------------------------------
async function executeQuizGradingAndRenderResults() {
  // 1. 객관식 및 OX는 클라이언트에서 소문자 및 공백 정제 후 비교 채점
  state.questions.forEach((q, idx) => {
    if (q.type === 'mcq' || q.type === 'tf') {
      const uAns = state.userAnswers[idx].selectedAnswer ? String(state.userAnswers[idx].selectedAnswer).toLowerCase().trim() : '';
      const cAns = q.correctAnswer ? String(q.correctAnswer).toLowerCase().trim() : '';
      state.userAnswers[idx].isCorrect = (uAns === cAns);
    }
  });

  // 2. 주관식 단답형 문항이 있는 경우, Gemini API에 전체 답안 묶음을 보내 스마트 채점 의뢰
  const shortQuestionsToGrade = state.questions
    .map((q, idx) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      correctAnswer: q.correctAnswer,
      userAnswer: state.userAnswers[idx].selectedAnswer
    }))
    .filter(q => q.type === 'short');

  if (shortQuestionsToGrade.length > 0) {
    try {
      const promptText = `너는 시험 채점관이다. 다음은 주관식 단답형 문제와 정답, 그리고 사용자가 입력한 답안이다.
각 문항별로 사용자의 답안이 정답과 의미상 동일한지 판정하여 맞으면 true, 틀리면 false로 채점하라.
특히 다음과 같은 채점 보정 규칙을 엄격히 적용하여 사용자가 억울하지 않게 채점하라:
1. 숫자 표현(예: '7')과 한글 숫자 표현(예: '일곱')은 동일하게 정답(true)으로 간주하라.
2. 영문 대소문자 차이, 공백(띄어쓰기) 차이, 유의어(예: 'AI'와 '인공지능') 등 의미가 일맥상통하면 정답(true)으로 간주하라.
3. 아주 경미한 맞춤법 오류나 오타도 정답(true)으로 너그럽게 인정하라.

채점할 문항 목록:
${JSON.stringify(shortQuestionsToGrade)}

반드시 아래 JSON 스키마 형식으로만 응답해야 하며, 마크업이나 코드블럭 없이 오직 순수한 JSON 데이터 구조만 출력해야 한다:
{
  "results": [
    {
      "id": 문항ID(숫자),
      "isCorrect": true 또는 false
    }
  ]
}`;

      const requestBody = {
        model: state.config.model,
        contents: [{
          parts: [{ text: promptText }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      if (!state.supabaseUrl || !state.supabaseAnonKey) {
        throw new Error('Supabase 프록시 설정이 되어 있지 않습니다. 설정(톱니바퀴 아이콘)에서 정보를 입력해주세요.');
      }

      const baseUrl = getSanitizedSupabaseUrl(state.supabaseUrl);
      const url = `${baseUrl}/functions/v1/gemini-proxy`;
      console.log("Requesting Supabase Grading URL:", url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.supabaseAnonKey.trim()}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API 통신 에러 (코드: ${response.status})`);
      }

      const resData = await response.json();
      const responseText = resData.candidates[0].content.parts[0].text;
      const gradingData = parseCleanJSON(responseText);

      if (gradingData.results) {
        gradingData.results.forEach(res => {
          const ansIdx = state.userAnswers.findIndex(ans => ans.questionId === res.id);
          if (ansIdx !== -1) {
            state.userAnswers[ansIdx].isCorrect = res.isCorrect;
          }
        });
      }
    } catch (err) {
      console.error('AI 주관식 채점 실패, 로컬 문자열 비교로 대체합니다:', err);
      // 실패 시 로컬 단순 문자열 비교로 백업 처리
      state.questions.forEach((q, idx) => {
        if (q.type === 'short') {
          const uClean = normalizeString(state.userAnswers[idx].selectedAnswer);
          const cClean = normalizeString(q.correctAnswer);
          state.userAnswers[idx].isCorrect = (uClean === cClean);
        }
      });
    }
  }

  // 결과 화면 전환 및 성적 렌더링
  renderQuizResults();
}

// ----------------------------------------------------
// 8. 결과 리포트 및 히스토리 관리
// ----------------------------------------------------
function renderQuizResults(shouldSave = true) {
  DOM.quizActiveState.classList.add('hidden');
  DOM.quizResultState.classList.remove('hidden');
  
  // 임시 저장 비우기
  clearActiveQuizState();

  const totalCount = state.questions.length;
  const correctCount = state.userAnswers.filter(ans => ans.isCorrect || ans.forcedCorrect).length;
  const score = Math.round((correctCount / totalCount) * 100);

  let feedback = '다음 번엔 더 나은 성적을 거둘 거예요!';
  if (score === 100) {
    feedback = '완벽합니다! 만점을 기록하셨어요! 🎉';
  } else if (score >= 80) {
    feedback = '아주 훌륭한 성적입니다! 👏';
  } else if (score >= 50) {
    feedback = '조금만 더 복습하면 완벽해질 거예요! 👍';
  }

  DOM.resultGradeText.innerText = feedback;
  DOM.resultScore.innerText = `${score} / 100`;
  DOM.resultCount.innerText = `${correctCount} / ${totalCount} 문항`;

  // 복습 목록 리스트업
  renderReviewList();
  
  // 히스토리에 현재 퀴즈 추가 및 저장
  if (shouldSave) {
    saveQuizToHistory(score, correctCount, totalCount);
  }
}

// 복습 상세 화면 렌더링
function renderReviewList() {
  DOM.quizReviewList.innerHTML = '';
  
  state.questions.forEach((q, idx) => {
    const userAns = state.userAnswers[idx];
    const isCorrect = userAns.isCorrect || userAns.forcedCorrect;
    
    const card = document.createElement('div');
    card.className = `p-4 rounded-xl border ${isCorrect ? 'border-emerald-100 bg-emerald-50/10 dark:border-emerald-950/20' : 'border-rose-100 bg-rose-50/10 dark:border-rose-950/20'} transition-all`;
    
    // 단답형이고 틀린 경우에만 "맞춤 처리하기" 버튼을 우측 상단에 노출
    const forceCorrectBtnHtml = (q.type === 'short' && !isCorrect) 
      ? `<button onclick="forceCorrectShortAnswer(${q.id})" class="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-indigo-200 dark:border-indigo-900 rounded px-2 py-0.5 bg-white dark:bg-slate-900 shadow-sm">맞춤 처리하기</button>`
      : '';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-[10px] font-extrabold uppercase tracking-wider ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}">
          ${idx + 1}. ${q.type === 'mcq' ? '객관식' : q.type === 'tf' ? 'OX 퀴즈' : '단답형'} - ${isCorrect ? '정답' : '오답'}
        </span>
        ${forceCorrectBtnHtml}
      </div>
      
      <p class="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">${q.question}</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs mb-2">
        <div><span class="text-slate-400">제출 답안:</span> <span class="font-medium ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${userAns.selectedAnswer || '입력 없음'}</span></div>
        <div><span class="text-slate-400">정답 보기:</span> <span class="font-semibold text-slate-700 dark:text-slate-300">${q.correctAnswer}</span></div>
      </div>
      
      <p class="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50 pt-1.5 mt-1.5">
        <span class="font-bold text-slate-600 dark:text-slate-300">해설:</span> ${q.explanation}
      </p>
    `;
    
    DOM.quizReviewList.appendChild(card);
  });
}

// 주관식 단답형 스마트 강제 정답 처리 (맞춤 처리하기)
window.forceCorrectShortAnswer = function(questionId) {
  const ansIdx = state.userAnswers.findIndex(ans => ans.questionId === questionId);
  if (ansIdx !== -1) {
    state.userAnswers[ansIdx].forcedCorrect = true;
    
    // 점수 및 상태판 리프레시
    const correctCount = state.userAnswers.filter(ans => ans.isCorrect || ans.forcedCorrect).length;
    const totalCount = state.questions.length;
    const score = Math.round((correctCount / totalCount) * 100);
    
    DOM.resultScore.innerText = `${score} / 100`;
    DOM.resultCount.innerText = `${correctCount} / ${totalCount} 문항`;
    
    // 복습 상세 화면 다시 렌더링
    renderReviewList();
    
    // 저장 기록 업데이트
    updateLastHistoryRecord(score, correctCount);
  }
};

// 퀴즈 결과 저장
function saveQuizToHistory(score, correctCount, totalCount) {
  // 대표 타이틀 (첫 번째 문제로 하거나 파일 이름)
  let title = '나만의 퀴즈';
  if (state.currentFiles && state.currentFiles.length > 0) {
    if (state.currentFiles.length === 1) {
      title = state.currentFiles[0].name;
    } else {
      title = `${state.currentFiles[0].name} 외 ${state.currentFiles.length - 1}개 파일`;
    }
  } else if (state.extractedText) {
    title = state.extractedText.slice(0, 15) + '... 퀴즈';
  }

  const record = {
    id: Date.now(),
    title: title,
    date: new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    score: score,
    correctCount: correctCount,
    totalCount: totalCount,
    questions: JSON.parse(JSON.stringify(state.questions)),
    userAnswers: JSON.parse(JSON.stringify(state.userAnswers))
  };

  state.history.unshift(record);
  localStorage.setItem('selqu_history', JSON.stringify(state.history));
  renderHistoryList();
}

// 강제 오버라이드로 변경 시, 최신 히스토리 스코어 갱신
function updateLastHistoryRecord(newScore, newCorrectCount) {
  if (state.history.length > 0) {
    state.history[0].score = newScore;
    state.history[0].correctCount = newCorrectCount;
    state.history[0].userAnswers = JSON.parse(JSON.stringify(state.userAnswers));
    localStorage.setItem('selqu_history', JSON.stringify(state.history));
    renderHistoryList();
  }
}

// 히스토리 렌더링
function renderHistoryList() {
  DOM.historyList.innerHTML = '';
  
  if (state.history.length === 0) {
    DOM.emptyHistory.classList.remove('hidden');
    return;
  }
  
  DOM.emptyHistory.classList.add('hidden');
  
  state.history.forEach(item => {
    const card = document.createElement('div');
    card.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 dark:bg-slate-800/40 dark:border-slate-800 hover:dark:border-indigo-500 cursor-pointer transition-all flex flex-col gap-1.5';
    
    // 점수 등급 서식
    const scoreColorClass = item.score >= 80 ? 'text-emerald-500' : item.score >= 50 ? 'text-amber-500' : 'text-rose-500';

    card.innerHTML = `
      <div class="flex items-center justify-between gap-1.5">
        <span class="text-xs font-bold truncate text-slate-700 dark:text-slate-300 flex-1">${item.title}</span>
        <span class="text-xs font-black ${scoreColorClass} flex-shrink-0">${item.score}점</span>
      </div>
      <div class="flex items-center justify-between text-[10px] text-slate-400">
        <span>${item.date}</span>
        <span>정답: ${item.correctCount}/${item.totalCount}</span>
      </div>
    `;
    
    // 클릭 시 역대 퀴즈 로드
    card.addEventListener('click', () => loadQuizFromHistory(item));
    DOM.historyList.appendChild(card);
  });
}

// 이전 퀴즈 기록 로드
function loadQuizFromHistory(historyItem) {
  state.questions = JSON.parse(JSON.stringify(historyItem.questions));
  state.userAnswers = JSON.parse(JSON.stringify(historyItem.userAnswers));
  state.currentQuestionIndex = 0;

  // 화면 상태 갱신
  DOM.quizIdleState.classList.add('hidden');
  DOM.quizActiveState.classList.add('hidden');
  DOM.quizResultState.classList.remove('hidden');
  
  renderQuizResults(false);
  sidebarToggle(false); // 모바일 편의성
}

// 전체 히스토리 삭제
function clearHistory() {
  if (confirm('모든 학습 역사 퀴즈 기록을 삭제하시겠습니까?')) {
    state.history = [];
    localStorage.removeItem('selqu_history');
    renderHistoryList();
  }
}

// 다시 풀기
function retryQuiz() {
  // 답변 초기화
  state.userAnswers = state.questions.map(q => ({
    questionId: q.id,
    selectedAnswer: null,
    isCorrect: false,
    forcedCorrect: false
  }));
  state.currentQuestionIndex = 0;

  DOM.quizResultState.classList.add('hidden');
  DOM.quizIdleState.classList.add('hidden');
  DOM.quizActiveState.classList.remove('hidden');
  
  renderQuestion(0);
  saveActiveQuizState();
}

// 새로운 퀴즈로 완전히 초기화
function resetToNewQuiz() {
  state.questions = [];
  state.userAnswers = [];
  state.currentQuestionIndex = 0;
  
  DOM.quizResultState.classList.add('hidden');
  DOM.quizActiveState.classList.add('hidden');
  DOM.quizIdleState.classList.remove('hidden');
  clearActiveQuizState();
}

// ----------------------------------------------------
// 8.5 풀이 상태 임시 저장 및 복원
// ----------------------------------------------------
function saveActiveQuizState() {
  if (state.questions && state.questions.length > 0) {
    const activeState = {
      questions: state.questions,
      userAnswers: state.userAnswers,
      currentQuestionIndex: state.currentQuestionIndex,
      extractedText: state.extractedText,
      currentFilesMeta: state.currentFiles ? state.currentFiles.map(f => ({ name: f.name, size: f.size, type: f.type })) : [],
      imageParts: state.imageParts
    };
    localStorage.setItem('selqu_active_quiz', JSON.stringify(activeState));
  } else {
    localStorage.removeItem('selqu_active_quiz');
  }
}

function loadActiveQuizState() {
  const raw = localStorage.getItem('selqu_active_quiz');
  if (!raw) return;
  try {
    const activeState = JSON.parse(raw);
    if (activeState.questions && activeState.questions.length > 0) {
      state.questions = activeState.questions;
      state.userAnswers = activeState.userAnswers;
      state.currentQuestionIndex = activeState.currentQuestionIndex || 0;
      state.extractedText = activeState.extractedText || '';
      state.imageParts = activeState.imageParts || [];
      state.currentFiles = activeState.currentFilesMeta || [];
      
      // 화면 상태 동기화
      DOM.quizIdleState.classList.add('hidden');
      DOM.quizResultState.classList.add('hidden');
      DOM.quizActiveState.classList.remove('hidden');
      
      // 파일 목록 표시 UI 복원
      if (state.currentFiles && state.currentFiles.length > 0) {
        DOM.parsedTextPreviewBox.classList.remove('hidden');
        DOM.parsedText.value = state.extractedText;
        DOM.charCount.innerText = `${state.extractedText.length}자`;
        DOM.dropzone.classList.add('hidden');
        DOM.fileInfoBox.classList.remove('hidden');
        
        if (state.currentFiles.length === 1) {
          DOM.fileName.innerText = state.currentFiles[0].name;
          let iconClass = 'fa-solid fa-file';
          if (state.currentFiles[0].type.startsWith('image/')) iconClass = 'fa-solid fa-file-image';
          else if (state.currentFiles[0].name.endsWith('.pdf')) iconClass = 'fa-solid fa-file-pdf';
          else if (state.currentFiles[0].name.endsWith('.xlsx') || state.currentFiles[0].name.endsWith('.xls')) iconClass = 'fa-solid fa-file-excel';
          else if (state.currentFiles[0].name.endsWith('.txt')) iconClass = 'fa-solid fa-file-lines';
          DOM.fileIcon.className = `${iconClass} text-indigo-500 flex-shrink-0`;
        } else {
          DOM.fileName.innerText = `${state.currentFiles[0].name} 외 ${state.currentFiles.length - 1}개 파일`;
          DOM.fileIcon.className = 'fa-solid fa-folder-open text-indigo-500 flex-shrink-0';
        }
      }
      
      renderQuestion(state.currentQuestionIndex);
    }
  } catch (e) {
    console.error('임시 저장 복원 실패:', e);
    localStorage.removeItem('selqu_active_quiz');
  }
}

function clearActiveQuizState() {
  localStorage.removeItem('selqu_active_quiz');
}

// ----------------------------------------------------
// 9. 텍스트 포맷팅 유틸리티
// ----------------------------------------------------
function parseCleanJSON(rawText) {
  let text = rawText.trim();
  // 만약 ```json ... ``` 형식으로 감싸져 있다면 제거
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "");
  }
  return JSON.parse(text.trim());
}

function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\s+/g, '')                  // 모든 공백 제거
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '') // 특수기호 제거
    .trim();
}

// 로드 시 실행
window.onload = init;
