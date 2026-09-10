/**
 * Whiteboard de Arquitetura de Computadores (Mono & Multiciclo)
 * Catálogo visual completo de diagramas (em branco e completos),
 * carregamento instantâneo, ferramentas de desenho e sincronização com IA.
 */

// Canvas & Context
const canvas = document.getElementById('whiteboardCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('canvasWrapper');

// State
let width = 0;
let height = 0;
let dpr = window.devicePixelRatio || 1;

// Viewport Transform (Pan & Zoom)
let zoom = 1.0;
let panX = 0;
let panY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;
let spacePressed = false;

// Drawing State
let currentTool = 'pen';
let currentColor = '#1e293b';
let currentSize = parseFloat(localStorage.getItem('whiteboard_stroke_size')) || 2.5;
let isDrawing = false;
let startX = 0;
let startY = 0;

// Data Layers
let elements = []; // { type: 'path'|'line'|'arrow'|'rect'|'mux'|'alu'|'text'|'image', ... }
let undoStack = [];
let redoStack = [];
let pendingUndoState = null;
const MAX_UNDO_STACK = 100;
let currentPath = null;
let drawStartState = null;
let selectedElement = null;
let isDraggingElement = false;
let dragStartState = null;
let dragStartPt = null;
let dragOriginalData = null;

let isResizingElement = false;
let resizeHandle = null;
let resizeStartPt = null;
let resizeStartState = null;
let resizeOriginalBox = null;

// Auto-save debounce timer
let autoSaveTimer = null;

// ==================== WebSocket Collaboration State ====================
let ws = null;
let wsClientId = null;
let wsConnected = false;
let wsReconnectTimer = null;
let myUserName = localStorage.getItem('whiteboard_username') || ('Amigo ' + Math.floor(100 + Math.random() * 900));
let myUserColor = localStorage.getItem('whiteboard_usercolor') || '#2563eb';
const peerCursors = new Map(); // clientId -> { x, y, name, color, tool, lastSeen }
const peerLiveStrokes = new Map(); // clientId -> { type, points, color, size, tool }
let lastCursorBroadcastTime = 0;
let lastStrokeBroadcastTime = 0;
let hasSentInitialSync = false;

// Static Curated Templates Catalog (Fallback guarantee!)
const STATIC_TEMPLATES = [
  // 0. Prova Real Oficial (UFSM)
  {
    filename: "prova_q1_add3.jpg",
    title: "🏆 Prova Q1: add3 $rd, $rs, $rt (Monociclo)",
    category: "🏆 Prova Real (UFSM)",
    badge: "prova",
    badgeText: "PROVA",
    desc: "Questão 1 da prova real (3.0 pts). Adicionar instrução rd = rs + rt + rd modificando o banco de registradores e inserindo 2ª ULA."
  },
  {
    filename: "prova_q2_subabs.jpg",
    title: "🏆 Prova Q2: subabs $rd, $rs, $rt (Monociclo)",
    category: "🏆 Prova Real (UFSM)",
    badge: "prova",
    badgeText: "PROVA",
    desc: "Questão 2 da prova real (3.0 pts). Adicionar instrução rd = |rs - rt|. Cuidado com o cálculo de módulo e seleção pelo bit de sinal!"
  },
  {
    filename: "prova_q3_relu.jpg",
    title: "🏆 Prova Q3: relu $rs (Multiciclo + FSM)",
    category: "🏆 Prova Real (UFSM)",
    badge: "prova",
    badgeText: "PROVA",
    desc: "Questão 3 da prova real (4.0 pts). Instrução if (rs > 0) rs = rs else rs = 0 no multiciclo com novos estados na FSM."
  },
  {
    filename: "prova1_pag_1.jpg",
    title: "🏆 Prova Completa - Página 1 (Q1 add3)",
    category: "🏆 Prova Real (UFSM)",
    badge: "prova",
    badgeText: "PROVA",
    desc: "Enunciado e datapath original da Questão 1 da prova."
  },
  {
    filename: "prova1_pag_2.jpg",
    title: "🏆 Prova Completa - Página 2 (Q2 subabs)",
    category: "🏆 Prova Real (UFSM)",
    badge: "prova",
    badgeText: "PROVA",
    desc: "Enunciado e datapath original da Questão 2 da prova."
  },
  {
    filename: "prova1_pag_3.jpg",
    title: "🏆 Prova Completa - Página 3 (Q3 relu)",
    category: "🏆 Prova Real (UFSM)",
    badge: "prova",
    badgeText: "PROVA",
    desc: "Enunciado e diagrama multiciclo original da Questão 3 da prova."
  },

  // 1. Incompletos (Para Praticar / Preencher)
  {
    filename: "incompleto_mono_sem_controle.jpg",
    title: "Monociclo em Branco (Sem Linhas de Controle)",
    category: "Incompletos (Para Praticar)",
    badge: "treino",
    badgeText: "Treino",
    desc: "Datapath completo com blocos e MUXes, mas sem fios de controle. Ideal para desenhar os sinais de cada instrução."
  },
  {
    filename: "incompleto_multi_sem_controle.jpg",
    title: "Multiciclo em Branco (Bloco Operacional com MUXes)",
    category: "Incompletos (Para Praticar)",
    badge: "treino",
    badgeText: "Treino",
    desc: "Bloco operacional com IR, MDR, A, B, ALUOut e MUXes, pronto para traçar a propagação dos passos."
  },
  {
    filename: "incompleto_mono_add_sub_lw_sw.jpg",
    title: "Monociclo Básico (ADD, SUB, LW, SW)",
    category: "Incompletos (Para Praticar)",
    badge: "treino",
    badgeText: "Treino",
    desc: "Datapath simplificado sem branch e sem jump, para praticar as primeiras instruções."
  },
  {
    filename: "incompleto_mono_apenas_regs_alu.jpg",
    title: "Monociclo Inicial (Apenas Banco de Registradores e ULA)",
    category: "Incompletos (Para Praticar)",
    badge: "treino",
    badgeText: "Treino",
    desc: "Blocos essenciais de operações Tipo R para entender o fluxo de dados entre registradores e ULA."
  },
  {
    filename: "incompleto_multi_apenas_registradores.jpg",
    title: "Multiciclo Inicial (Registradores Internos)",
    category: "Incompletos (Para Praticar)",
    badge: "treino",
    badgeText: "Treino",
    desc: "Esquemático com os registradores temporários IR, MDR, A, B, ALUOut para praticar a lógica de multiplexação."
  },

  // 2. Completos (Referência & Estudo)
  {
    filename: "completo_mono_datapath_controle.jpg",
    title: "Monociclo Completo com Controle",
    category: "Completos (Referência)",
    badge: "completo",
    badgeText: "Completo",
    desc: "Caminho de dados monociclo com unidade de controle principal, ALU Control e todos os barramentos azuis."
  },
  {
    filename: "completo_mono_com_jump.jpg",
    title: "Monociclo Completo com Jump",
    category: "Completos (Referência)",
    badge: "completo",
    badgeText: "Completo",
    desc: "Datapath completo com suporte à instrução incondicional Jump (formato J) e MUX do PC."
  },
  {
    filename: "completo_mono_tabela_sinais.jpg",
    title: "Tabela de Sinais de Controle (Monociclo)",
    category: "Completos (Referência)",
    badge: "completo",
    badgeText: "Tabela",
    desc: "Tabela oficial dos sinais RegDst, ALUSrc, MemtoReg, RegWrite, MemRead, MemWrite, Branch, ALUOp."
  },
  {
    filename: "completo_multi_datapath.jpg",
    title: "Multiciclo Completo com Controle",
    category: "Completos (Referência)",
    badge: "completo",
    badgeText: "Completo",
    desc: "Caminho de dados multiciclo completo com sinais IorD, ALUSelA, ALUSelB, PCSource, IRWrite, etc."
  },
  {
    filename: "completo_multi_fsm_10_estados.png",
    title: "FSM Multiciclo Completa (10 Estados)",
    category: "Completos (Referência)",
    badge: "completo",
    badgeText: "FSM",
    desc: "Máquina de estados finitos detalhada de 10 estados (0 a 9) com todas as condições de transição e sinais."
  },
  {
    filename: "completo_multi_excecoes.jpg",
    title: "Multiciclo Completo com Exceções",
    category: "Completos (Referência)",
    badge: "completo",
    badgeText: "Exceções",
    desc: "Hardware estendido para suporte a exceções (EPC, Cause, registrador de status, vetor 0x80000180)."
  },
  {
    filename: "completo_multi_fsm_excecoes.jpg",
    title: "FSM Completa com Exceções (Estados 10 e 11)",
    category: "Completos (Referência)",
    badge: "completo",
    badgeText: "FSM",
    desc: "FSM estendida com os estados 10 (Instrução Indefinida) e 11 (Overflow Aritmético)."
  },

  // 3. Passos do Multiciclo
  {
    filename: "passo_1_busca_fetch.jpg",
    title: "Passo 1: Busca de Instrução (IR = Mem[PC]; PC = PC + 4)",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 1",
    desc: "Destaque do caminho percorrido durante a busca da instrução e incremento do PC."
  },
  {
    filename: "passo_2_decodificacao_branch.jpg",
    title: "Passo 2: Decodificação e Branch Antecipado",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 2",
    desc: "Leitura de registradores (A e B) e cálculo antecipado do endereço de salto na ULA."
  },
  {
    filename: "passo_3_tipo_r_execucao.jpg",
    title: "Passo 3: Execução Tipo R (ALUOut = A op B)",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 3",
    desc: "Cálculo da operação aritmética ou lógica na ULA para instruções Tipo R."
  },
  {
    filename: "passo_4_tipo_r_writeback.jpg",
    title: "Passo 4: Write-Back Tipo R (Reg[rd] = ALUOut)",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 4",
    desc: "Gravação do resultado da ULA no registrador de destino rd."
  },
  {
    filename: "passo_3_memoria_endereco.jpg",
    title: "Passo 3: Memória (Cálculo de Endereço A + offset)",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 3",
    desc: "Cálculo do endereço efetivo de memória para instruções LW e SW."
  },
  {
    filename: "passo_4_load_leitura.jpg",
    title: "Passo 4: Leitura da Memória (MDR = Mem[ALUOut])",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 4",
    desc: "Acesso de leitura à memória de dados para instrução LW."
  },
  {
    filename: "passo_5_load_writeback.jpg",
    title: "Passo 5: Write-Back LW (Reg[rt] = MDR)",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 5",
    desc: "Conclusão do LW: gravação do dado da memória no registrador rt."
  },
  {
    filename: "passo_4_store_memoria.jpg",
    title: "Passo 4: Escrita na Memória SW (Mem[ALUOut] = B)",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 4",
    desc: "Gravação do dado do registrador B na memória de dados (conclusão do SW)."
  },
  {
    filename: "passo_3_branch_desvio.jpg",
    title: "Passo 3: Decisão de Branch (if A == B then PC = ALUOut)",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 3",
    desc: "Comparação de registradores na ULA e atualização condicional do PC."
  },
  {
    filename: "passo_3_jump_salto.jpg",
    title: "Passo 3: Salto Incondicional Jump",
    category: "Passos Multiciclo",
    badge: "passo",
    badgeText: "Passo 3",
    desc: "Atualização do PC com o endereço de 26 bits deslocado."
  },

  // 4. Exercícios dos Slides
  {
    filename: "exercicio_4_1_and.jpg",
    title: "Exercício 4.1: Sinais e Recursos da Instrução AND",
    category: "Exercícios dos Slides",
    badge: "ex",
    badgeText: "Ex 4.1",
    desc: "Identificar sinais de controle e blocos ativos/inativos para a instrução AND Rd, Rs, Rt."
  },
  {
    filename: "exercicio_4_2_lwi.jpg",
    title: "Exercício 4.2: Implementando Nova Instrução LWI Rt, Rd(Rs)",
    category: "Exercícios dos Slides",
    badge: "ex",
    badgeText: "Ex 4.2",
    desc: "Load Word com deslocamento em registrador. Quais blocos e sinais adicionar ao datapath?"
  },
  {
    filename: "exercicio_4_3_speedup.jpg",
    title: "Exercício 4.3: Latências, Multiplicador e Speedup",
    category: "Exercícios dos Slides",
    badge: "ex",
    badgeText: "Ex 4.3",
    desc: "Calcular tempo de ciclo com e sem multiplicador e avaliar o ganho real de desempenho."
  },
  {
    filename: "exercicio_4_4_caminho_critico.jpg",
    title: "Exercício 4.4: Caminho Crítico e Tempo de Relógio",
    category: "Exercícios dos Slides",
    badge: "ex",
    badgeText: "Ex 4.4",
    desc: "Calcular o ciclo para processadores que só fazem fetch, branch relativo ou condicional."
  },
  {
    filename: "exercicio_5_8_jr.jpg",
    title: "Exercício 5.8: Adicionando Instrução JR $ra (Jump Register)",
    category: "Exercícios dos Slides",
    badge: "ex",
    badgeText: "Ex 5.8",
    desc: "Desenhar as modificações necessárias no caminho de dados para suportar PC = Reg[rs]."
  },
  {
    filename: "exercicio_5_11_lwpi.jpg",
    title: "Exercício 5.11 a 5.14: LWPI (Pós-Incremento) e SWAP",
    category: "Exercícios dos Slides",
    badge: "ex",
    badgeText: "Ex 5.11",
    desc: "Por que o Monociclo não suporta LWPI sem duplicar portas e como o Multiciclo resolve em 6 ciclos."
  },
  {
    filename: "exercicio_5_29_stuck_at.jpg",
    title: "Exercício 5.29: Falhas Presas (Stuck-at) no Multiciclo",
    category: "Exercícios dos Slides",
    badge: "ex",
    badgeText: "Ex 5.29",
    desc: "Efeito de sinais presos em 0 ou 1 (IRWrite=0, PCWrite=0, PCWriteCond=0, etc.)."
  },
  {
    filename: "exercicio_5_49_eret.jpg",
    title: "Exercício 5.49 e 5.50: Instrução ERET e Tratamento de Exceções",
    category: "Exercícios dos Slides",
    badge: "ex",
    badgeText: "Ex 5.49",
    desc: "Implementação do retorno de exceção PC = EPC no caminho de dados e FSM."
  }
];

// DOM Elements
const templateSelect = document.getElementById('templateSelect');
const optgroupExam = document.getElementById('optgroup-exam');
const optgroupIncomplete = document.getElementById('optgroup-incomplete');
const optgroupComplete = document.getElementById('optgroup-complete');
const optgroupSteps = document.getElementById('optgroup-steps');
const optgroupExercises = document.getElementById('optgroup-exercises');
const btnOpenGallery = document.getElementById('btnOpenGallery');
const galleryModal = document.getElementById('galleryModal');
const btnCloseGallery = document.getElementById('btnCloseGallery');
const galleryGrid = document.getElementById('galleryGrid');

const btnSaveAI = document.getElementById('btnSaveAI');
const btnSaveAIFocus = document.getElementById('btnSaveAIFocus');
const btnExportPNG = document.getElementById('btnExportPNG');
const btnExportFullPNG = document.getElementById('btnExportFullPNG');
const btnExportJSON = document.getElementById('btnExportJSON');
const importJsonInput = document.getElementById('importJsonInput');
const exportDropdown = document.getElementById('exportDropdown');
const btnExportMenu = document.getElementById('btnExportMenu');
const btnGridToggle = document.getElementById('btnGridToggle');
const btnShortcuts = document.getElementById('btnShortcuts');
const shortcutsModal = document.getElementById('shortcutsModal');
const btnCloseShortcuts = document.getElementById('btnCloseShortcuts');
const btnClearCanvas = document.getElementById('btnClearCanvas');
const syncBadge = document.getElementById('syncBadge');
const syncText = document.getElementById('syncText');
const fileInput = document.getElementById('fileInput');
const zoomLevelEl = document.getElementById('zoomLevel');
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnZoomReset = document.getElementById('btnZoomReset');
const btnZoomFit = document.getElementById('btnZoomFit');
const toolPalette = document.getElementById('toolPalette');
const btnTogglePalette = document.getElementById('btnTogglePalette');
const studySidebar = document.getElementById('studySidebar');
const btnToggleSidebar = document.getElementById('btnToggleSidebar');
const btnCloseSidebar = document.getElementById('btnCloseSidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const strokeSizeSlider = document.getElementById('strokeSizeSlider');
const strokeSizeLabel = document.getElementById('strokeSizeLabel');
const strokePreviewDot = document.getElementById('strokePreviewDot');

function setStrokeSize(size, updateSlider = true) {
  const parsed = parseFloat(size);
  if (isNaN(parsed) || parsed <= 0) return;
  currentSize = Math.max(0.5, Math.min(36, parsed));
  localStorage.setItem('whiteboard_stroke_size', currentSize.toString());

  if (updateSlider && strokeSizeSlider) {
    strokeSizeSlider.value = currentSize;
  }
  if (strokeSizeLabel) {
    strokeSizeLabel.textContent = `${currentSize} px`;
  }
  updateStrokePreview();
  updateEraserCursorSize();

  document.querySelectorAll('.size-chip').forEach(chip => {
    if (parseFloat(chip.dataset.size) === currentSize) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function updateStrokePreview() {
  if (strokePreviewDot) {
    const d = Math.min(14, Math.max(2, Math.round(currentSize)));
    strokePreviewDot.style.width = `${d}px`;
    strokePreviewDot.style.height = `${d}px`;
    strokePreviewDot.style.backgroundColor = currentColor;
  }
}

const canvasHint = document.getElementById('canvasHint');

// Grid state (dots, lines, none)
let gridMode = localStorage.getItem('whiteboard_grid') || 'dots';

// Collaboration DOM Elements
const btnCollaborate = document.getElementById('btnCollaborate');
const collabModal = document.getElementById('collabModal');
const btnCloseCollab = document.getElementById('btnCloseCollab');
const collabBadge = document.getElementById('collabBadge');
const collabLocalUrl = document.getElementById('collabLocalUrl');
const btnCopyLocalUrl = document.getElementById('btnCopyLocalUrl');
const btnCopyTunnelCmd = document.getElementById('btnCopyTunnelCmd');
const btnCopyCloudflareCmd = document.getElementById('btnCopyCloudflareCmd');
const collabUsernameInput = document.getElementById('collabUsernameInput');
const collabColorPicker = document.getElementById('collabColorPicker');
const collabStatusText = document.getElementById('collabStatusText');
const collabStatusIndicator = document.getElementById('collabStatusIndicator');

// Initialize
window.addEventListener('load', () => {
  resizeCanvas();
  populateDropdown(STATIC_TEMPLATES);
  buildGalleryModal(STATIC_TEMPLATES);
  loadTemplateOptions(); // fetch dynamic from server if available
  loadSavedBoard();
  setupEventListeners();
  setStrokeSize(currentSize, true);
  setupHotkeys();
  updateUndoRedoUI();
  setupCollabUI();
  initWebSocket();

  // Watch for container resizes dynamically
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      resizeCanvas();
    });
    ro.observe(wrapper);
  }

  // Fade out hint after 8s
  setTimeout(() => {
    if (canvasHint) canvasHint.style.opacity = '0';
  }, 8000);
});

window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
  width = wrapper.clientWidth;
  height = wrapper.clientHeight;
  dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  render();
}

// Coordinate conversions (Screen <-> Virtual Canvas)
function screenToCanvas(sx, sy) {
  return {
    x: (sx - panX) / zoom,
    y: (sy - panY) / zoom
  };
}

function canvasToScreen(cx, cy) {
  return {
    x: cx * zoom + panX,
    y: cy * zoom + panY
  };
}

// Image cache for fast, flicker-free undo/redo
const imageCache = new Map();

function ensureElementIds() {
  const seen = new Set();
  for (const el of elements) {
    if (!el.id || seen.has(el.id)) {
      el.id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
    seen.add(el.id);
  }
}

function serializeBoardState() {
  ensureElementIds();
  return JSON.stringify(elements, (key, value) => {
    if (key === 'imgObj') return undefined;
    return value;
  });
}

function updateUndoRedoUI() {
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  if (btnUndo) {
    btnUndo.disabled = undoStack.length === 0;
    btnUndo.style.opacity = undoStack.length === 0 ? '0.45' : '1';
    btnUndo.style.cursor = undoStack.length === 0 ? 'not-allowed' : 'pointer';
  }
  if (btnRedo) {
    btnRedo.disabled = redoStack.length === 0;
    btnRedo.style.opacity = redoStack.length === 0 ? '0.45' : '1';
    btnRedo.style.cursor = redoStack.length === 0 ? 'not-allowed' : 'pointer';
  }
}

// Each history entry contains only the changes made by this browser.
function boardChanges(before, after) {
  const old = new Map(before.map((el, index) => [el.id, { el, index }]));
  const next = new Map(after.map((el, index) => [el.id, { el, index }]));
  return [...new Set([...old.keys(), ...next.keys()])].flatMap(id => {
    const a = old.get(id), b = next.get(id);
    if (JSON.stringify(a?.el) === JSON.stringify(b?.el)) return [];
    return [{ id, before: a?.el || null, after: b?.el || null,
      beforeIndex: a?.index, afterIndex: b?.index }];
  });
}

function applyBoardChanges(board, changes) {
  const result = board.slice();
  for (const change of changes) {
    const index = result.findIndex(el => el.id === change.id);
    if (change.after === null) {
      if (index >= 0) result.splice(index, 1);
    } else {
      if (index >= 0) result.splice(index, 1);
      const position = change.afterIndex ?? (index >= 0 ? index : result.length);
      // History values must remain immutable when the restored element is edited.
      result.splice(position, 0, JSON.parse(JSON.stringify(change.after)));
    }
  }
  return result;
}

function pushUndoState(stateStr) {
  pendingUndoState = stateStr;
}

function recordState() {
  pushUndoState(serializeBoardState());
  scheduleAutoSave();
}

function commitLocalAction() {
  if (pendingUndoState === null) return false;
  const changes = boardChanges(JSON.parse(pendingUndoState), JSON.parse(serializeBoardState()));
  pendingUndoState = null;
  if (changes.length) {
    undoStack.push(changes);
    if (undoStack.length > MAX_UNDO_STACK) undoStack.shift();
    redoStack = [];
    sendWsMessage({ type: 'board_patch', changes });
  }
  updateUndoRedoUI();
  return true;
}

function reverseChanges(changes) {
  return changes.map(change => ({ id: change.id, before: change.after, after: change.before,
    beforeIndex: change.afterIndex, afterIndex: change.beforeIndex }));
}

function travelHistory(from, to, label) {
  if (isDrawing || isDraggingElement || isResizingElement || from.length === 0) return;
  const current = JSON.parse(serializeBoardState());
  const entry = from.pop();
  if (!entry) return;
  const rawChanges = reverseChanges(entry);
  const changes = rawChanges.filter(change => {
    const el = current.find(e => e.id === change.id) || null;
    // Undoing creation: element must be on board to be removed
    if (change.after === null) {
      return el !== null;
    }
    // Undoing deletion: can always be restored
    if (change.before === null) {
      return true;
    }
    // Undoing modification (move, resize, text change)
    return el !== null;
  });

  if (changes.length) {
    elements = applyBoardChanges(current, changes);
    to.push(changes);
    if (to.length > MAX_UNDO_STACK) to.shift();
    selectedElement = null;
    rehydrateImages();
    render();
    scheduleAutoSave();
    sendWsMessage({ type: 'board_patch', changes });
    showSyncBadge(label, 'saved');
  } else {
    showSyncBadge('Ação já alterada ou desfeita', 'saving');
  }
  updateUndoRedoUI();
}

function undo() {
  travelHistory(undoStack, redoStack, 'Sua ação foi desfeita');
}

function redo() {
  travelHistory(redoStack, undoStack, 'Sua ação foi refeita');
}

// Remote changes also update the starting point of an ongoing gesture,
// so they are never recorded as part of that local action.
function receiveBoardChanges(changes) {
  const rebase = state => state === null ? null : JSON.stringify(applyBoardChanges(JSON.parse(state), changes));
  pendingUndoState = rebase(pendingUndoState);
  drawStartState = rebase(drawStartState);
  dragStartState = rebase(dragStartState);
  eraseStartState = rebase(eraseStartState);
  if (isResizingElement && resizeStartState) resizeStartState = rebase(resizeStartState);
  elements = applyBoardChanges(elements, changes);
  if (selectedElement) selectedElement = elements.find(el => el.id === selectedElement.id) || null;
  rehydrateImages();
  render();
}

function rehydrateImages() {
  elements.forEach(el => {
    if (el.type === 'image') {
      if (el.imgObj && el.imgObj.complete) {
        imageCache.set(el.src, el.imgObj);
        return;
      }
      if (imageCache.has(el.src)) {
        el.imgObj = imageCache.get(el.src);
      } else {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          imageCache.set(el.src, img);
          render();
        };
        img.src = el.src;
        el.imgObj = img;
        if (img.complete) {
          imageCache.set(el.src, img);
        }
      }
    }
  });
}

function drawGrid(context, mode) {
  const gridSize = 40;
  const startX = Math.floor((-panX / zoom) / gridSize) * gridSize - gridSize;
  const startY = Math.floor((-panY / zoom) / gridSize) * gridSize - gridSize;
  const endX = startX + Math.ceil(width / zoom) + gridSize * 2;
  const endY = startY + Math.ceil(height / zoom) + gridSize * 2;

  context.save();
  if (mode === 'dots') {
    context.fillStyle = 'rgba(148, 163, 184, 0.35)';
    const dotRadius = Math.max(0.8, 1.2 / Math.sqrt(zoom));
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        context.beginPath();
        context.arc(x, y, dotRadius, 0, Math.PI * 2);
        context.fill();
      }
    }
  } else if (mode === 'lines') {
    context.strokeStyle = 'rgba(226, 232, 240, 0.45)';
    context.lineWidth = 1 / zoom;
    context.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      context.moveTo(x, startY);
      context.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      context.moveTo(startX, y);
      context.lineTo(endX, y);
    }
    context.stroke();
  }
  context.restore();
}

// Render Canvas
function render() {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  // Apply Pan & Zoom
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // Render Background Grid
  if (gridMode !== 'none') {
    drawGrid(ctx, gridMode);
  }

  // Render elements
  elements.forEach(el => drawElement(ctx, el));

  // Render active drawing path/shape preview
  if (isDrawing && currentPath) {
    drawElement(ctx, currentPath);
  }

  // Render peer live strokes in progress
  peerLiveStrokes.forEach(stroke => {
    drawElement(ctx, stroke);
  });

  // Draw selection outline
  if (selectedElement) {
    drawSelectionBox(ctx, selectedElement);
  }

  // Draw peer cursors
  const now = Date.now();
  peerCursors.forEach((peer) => {
    if (now - peer.lastSeen < 15000) {
      drawPeerCursor(ctx, peer);
    }
  });

  ctx.restore();
  updateZoomIndicator();
}

/**
 * Smooth Catmull-Rom Cardinal Spline
 * Converts sampled points into smooth cubic Bézier segments that pass
 * PRECISELY through every single point, eliminating corner-cutting and
 * maintaining 100% fidelity to what was drawn.
 */
function drawSmoothSpline(context, pts) {
  const n = pts.length;
  if (n < 2) return;
  if (n === 2) {
    context.moveTo(pts[0].x, pts[0].y);
    context.lineTo(pts[1].x, pts[1].y);
    return;
  }

  // Gentle tension (0.15) provides natural curvature without overshooting or clipping
  const k = 0.15;
  context.moveTo(pts[0].x, pts[0].y);

  // First segment
  const cp1x = pts[0].x + (pts[1].x - pts[0].x) * 0.25;
  const cp1y = pts[0].y + (pts[1].y - pts[0].y) * 0.25;
  const cp2x = pts[1].x - (pts[2].x - pts[0].x) * k;
  const cp2y = pts[1].y - (pts[2].y - pts[0].y) * k;
  context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pts[1].x, pts[1].y);

  // Middle segments
  for (let i = 1; i < n - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    const c1x = p1.x + (p2.x - p0.x) * k;
    const c1y = p1.y + (p2.y - p0.y) * k;
    const c2x = p2.x - (p3.x - p1.x) * k;
    const c2y = p2.y - (p3.y - p1.y) * k;

    context.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
  }

  // Last segment
  const pPrev2 = pts[n - 3];
  const pPrev = pts[n - 2];
  const pLast = pts[n - 1];

  const lastCp1x = pPrev.x + (pLast.x - pPrev2.x) * k;
  const lastCp1y = pPrev.y + (pLast.y - pPrev2.y) * k;
  const lastCp2x = pLast.x - (pLast.x - pPrev.x) * 0.25;
  const lastCp2y = pLast.y - (pLast.y - pPrev.y) * 0.25;
  context.bezierCurveTo(lastCp1x, lastCp1y, lastCp2x, lastCp2y, pLast.x, pLast.y);
}

function drawElement(context, el) {
  context.save();

  if (el.type === 'path') {
    if (!el.points || el.points.length === 0) {
      context.restore();
      return;
    }
    const pts = el.points;
    context.strokeStyle = el.color;
    context.lineWidth = el.size;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (el.tool === 'highlighter') {
      context.globalAlpha = 0.35;
      context.lineWidth = el.size * 2.8;
    } else {
      context.globalAlpha = 1.0;
    }

    if (pts.length === 1) {
      // Single click / dot
      context.beginPath();
      context.fillStyle = el.color;
      const dotRadius = Math.max(0.75, (el.tool === 'highlighter' ? el.size * 1.4 : el.size / 2));
      context.arc(pts[0].x, pts[0].y, dotRadius, 0, Math.PI * 2);
      context.fill();
    } else if (pts.length === 2) {
      context.beginPath();
      context.moveTo(pts[0].x, pts[0].y);
      context.lineTo(pts[1].x, pts[1].y);
      context.stroke();
    } else {
      // Catmull-Rom spline: smooth curve that touches every point faithfully
      context.beginPath();
      drawSmoothSpline(context, pts);
      context.stroke();
    }
  }
  else if (el.type === 'line') {
    context.beginPath();
    context.strokeStyle = el.color;
    context.lineWidth = el.size;
    context.lineCap = 'round';
    context.moveTo(el.x1, el.y1);
    context.lineTo(el.x2, el.y2);
    context.stroke();
  }
  else if (el.type === 'arrow') {
    context.beginPath();
    context.strokeStyle = el.color;
    context.fillStyle = el.color;
    context.lineWidth = el.size;
    context.lineCap = 'round';

    // Draw main line
    context.moveTo(el.x1, el.y1);
    context.lineTo(el.x2, el.y2);
    context.stroke();

    // Draw arrowhead
    const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
    const headLen = Math.max(10, el.size * 3.5);
    context.beginPath();
    context.moveTo(el.x2, el.y2);
    context.lineTo(
      el.x2 - headLen * Math.cos(angle - Math.PI / 6),
      el.y2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    context.lineTo(
      el.x2 - headLen * Math.cos(angle + Math.PI / 6),
      el.y2 - headLen * Math.sin(angle + Math.PI / 6)
    );
    context.closePath();
    context.fill();
  }
  else if (el.type === 'rect') {
    context.strokeStyle = el.color;
    context.lineWidth = el.size;
    context.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const rx = Math.min(el.x1, el.x2);
    const ry = Math.min(el.y1, el.y2);
    const rw = Math.abs(el.x2 - el.x1);
    const rh = Math.abs(el.y2 - el.y1);
    context.fillRect(rx, ry, rw, rh);
    context.strokeRect(rx, ry, rw, rh);
  }
  else if (el.type === 'mux') {
    const rx = Math.min(el.x1, el.x2);
    const ry = Math.min(el.y1, el.y2);
    const rw = Math.max(30, Math.abs(el.x2 - el.x1));
    const rh = Math.max(50, Math.abs(el.y2 - el.y1));

    context.strokeStyle = el.color;
    context.lineWidth = el.size;
    context.fillStyle = '#ffffff';

    context.beginPath();
    context.moveTo(rx, ry);
    context.lineTo(rx + rw, ry + rh * 0.15);
    context.lineTo(rx + rw, ry + rh * 0.85);
    context.lineTo(rx, ry + rh);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = el.color;
    context.font = 'bold 11px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('MUX', rx + rw / 2, ry + rh / 2);
  }
  else if (el.type === 'alu') {
    const rx = Math.min(el.x1, el.x2);
    const ry = Math.min(el.y1, el.y2);
    const rw = Math.max(50, Math.abs(el.x2 - el.x1));
    const rh = Math.max(60, Math.abs(el.y2 - el.y1));

    context.strokeStyle = el.color;
    context.lineWidth = el.size;
    context.fillStyle = '#ffffff';

    context.beginPath();
    context.moveTo(rx, ry);
    context.lineTo(rx + rw, ry + rh * 0.35);
    context.lineTo(rx + rw, ry + rh * 0.65);
    context.lineTo(rx, ry + rh);
    context.lineTo(rx, ry + rh * 0.60);
    context.lineTo(rx + rw * 0.25, ry + rh * 0.50);
    context.lineTo(rx, ry + rh * 0.40);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = el.color;
    context.font = 'bold 11px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('ULA / ALU', rx + rw * 0.45, ry + rh / 2);
  }
  else if (el.type === 'text') {
    const fontSize = Math.round(Math.max(12, Math.min(48, (el.size || 2.5) * 2 + 12)));
    context.fillStyle = el.color;
    context.font = `${fontSize}px 'Fira Code', monospace`;
    context.textBaseline = 'top';
    context.fillText(el.text, el.x, el.y);
  }
  else if (el.type === 'image') {
    if (el.imgObj && el.imgObj.complete) {
      context.drawImage(el.imgObj, el.x, el.y, el.width, el.height);
    } else if (!el.imgObj) {
      const img = new Image();
      img.onload = () => render();
      img.src = el.src;
      el.imgObj = img;
    }
  }

  context.restore();
}

// ==================== Selection & Geometry System ====================

function getElementBoundingBox(el) {
  if (!el) return null;
  if (el.type === 'image') {
    return { x: el.x, y: el.y, width: el.width, height: el.height };
  } else if (el.type === 'rect' || el.type === 'mux' || el.type === 'alu') {
    const x = Math.min(el.x1, el.x2);
    const y = Math.min(el.y1, el.y2);
    return {
      x,
      y,
      width: Math.max(12, Math.abs(el.x2 - el.x1)),
      height: Math.max(12, Math.abs(el.y2 - el.y1))
    };
  } else if (el.type === 'line' || el.type === 'arrow') {
    const x = Math.min(el.x1, el.x2);
    const y = Math.min(el.y1, el.y2);
    return {
      x,
      y,
      width: Math.max(12, Math.abs(el.x2 - el.x1)),
      height: Math.max(12, Math.abs(el.y2 - el.y1))
    };
  } else if (el.type === 'text') {
    const fontSize = Math.round(Math.max(12, Math.min(48, (el.size || 2.5) * 2 + 12)));
    const estWidth = Math.max(24, (el.text || '').length * (fontSize * 0.62));
    return {
      x: el.x,
      y: el.y,
      width: estWidth,
      height: Math.max(16, fontSize * 1.35)
    };
  } else if (el.type === 'path' && el.points && el.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < el.points.length; i++) {
      const p = el.points[i];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = Math.max(6, ((el.size || 2.5) / 2) + 2);
    return {
      x: minX - pad,
      y: minY - pad,
      width: Math.max(12, (maxX - minX) + pad * 2),
      height: Math.max(12, (maxY - minY) + pad * 2)
    };
  }
  return null;
}

function getImageResizeHandles(bbox) {
  const x = bbox.x;
  const y = bbox.y;
  const w = bbox.width;
  const h = bbox.height;
  const mx = x + w / 2;
  const my = y + h / 2;

  return [
    { id: 'nw', x: x, y: y, cursor: 'nwse-resize' },
    { id: 'ne', x: x + w, y: y, cursor: 'nesw-resize' },
    { id: 'se', x: x + w, y: y + h, cursor: 'nwse-resize' },
    { id: 'sw', x: x, y: y + h, cursor: 'nesw-resize' },
    { id: 'n',  x: mx, y: y, cursor: 'ns-resize' },
    { id: 'e',  x: x + w, y: my, cursor: 'ew-resize' },
    { id: 's',  x: mx, y: y + h, cursor: 'ns-resize' },
    { id: 'w',  x: x, y: my, cursor: 'ew-resize' }
  ];
}

function hitTestResizeHandle(el, px, py) {
  if (!el || el.type !== 'image') return null;
  const bbox = getElementBoundingBox(el);
  if (!bbox) return null;
  const pad = Math.max(4, 4 / zoom);
  const handles = getImageResizeHandles({
    x: bbox.x - pad,
    y: bbox.y - pad,
    width: bbox.width + pad * 2,
    height: bbox.height + pad * 2
  });
  const handleRadius = Math.max(8, 10 / zoom);
  for (const h of handles) {
    if (Math.hypot(px - h.x, py - h.y) <= handleRadius) {
      return h;
    }
  }
  return null;
}

function distToSegmentSquared(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

function hitTestElement(el, px, py) {
  const bbox = getElementBoundingBox(el);
  if (!bbox) return false;

  // Broadphase margin check
  const margin = Math.max(8, 10 / zoom);
  if (px < bbox.x - margin || px > bbox.x + bbox.width + margin ||
      py < bbox.y - margin || py > bbox.y + bbox.height + margin) {
    return false;
  }

  if (el.type === 'image' || el.type === 'rect' || el.type === 'mux' || el.type === 'alu' || el.type === 'text') {
    return px >= bbox.x - 4 && px <= bbox.x + bbox.width + 4 &&
           py >= bbox.y - 4 && py <= bbox.y + bbox.height + 4;
  }

  if (el.type === 'line' || el.type === 'arrow') {
    const threshold = Math.max(8, (el.size || 2.5) + 6);
    const d2 = distToSegmentSquared(px, py, el.x1, el.y1, el.x2, el.y2);
    return d2 <= threshold * threshold;
  }

  if (el.type === 'path') {
    if (!el.points || el.points.length === 0) return false;
    if (el.points.length === 1) {
      const d = Math.hypot(px - el.points[0].x, py - el.points[0].y);
      return d <= Math.max(10, (el.size || 2.5) + 6);
    }
    const threshold = Math.max(8, (el.size || 2.5) + 6);
    const thresholdSq = threshold * threshold;
    for (let i = 0; i < el.points.length - 1; i++) {
      const p1 = el.points[i];
      const p2 = el.points[i + 1];
      if (distToSegmentSquared(px, py, p1.x, p1.y, p2.x, p2.y) <= thresholdSq) {
        return true;
      }
    }
    return false;
  }

  return false;
}

function drawSelectionBox(context, el) {
  const bbox = getElementBoundingBox(el);
  if (!bbox) return;

  context.save();
  const pad = Math.max(4, 4 / zoom);
  const sx = bbox.x - pad;
  const sy = bbox.y - pad;
  const sw = bbox.width + pad * 2;
  const sh = bbox.height + pad * 2;

  // Translucent highlight & dashed boundary
  context.fillStyle = 'rgba(37, 99, 235, 0.05)';
  context.fillRect(sx, sy, sw, sh);

  context.strokeStyle = '#2563eb';
  context.lineWidth = Math.max(1.2, 1.5 / zoom);
  context.setLineDash([5 / zoom, 3 / zoom]);
  context.strokeRect(sx, sy, sw, sh);

  // If it's an image, draw 8 resize handles and dimension badge
  if (el.type === 'image') {
    const handles = getImageResizeHandles({ x: sx, y: sy, width: sw, height: sh });
    const handleR = Math.max(4, 5.5 / zoom);

    handles.forEach(h => {
      context.save();
      context.setLineDash([]);
      context.fillStyle = '#ffffff';
      context.strokeStyle = '#2563eb';
      context.lineWidth = Math.max(1.5, 2 / zoom);

      context.beginPath();
      context.arc(h.x, h.y, handleR, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
    });

    // Dimension badge below image
    context.save();
    context.setLineDash([]);
    const badgeText = `${Math.round(el.width)} × ${Math.round(el.height)}`;
    const fontSize = Math.max(9, 11 / zoom);
    context.font = `600 ${fontSize}px Inter, sans-serif`;
    const textMetrics = context.measureText(badgeText);
    const badgeW = textMetrics.width + 12 / zoom;
    const badgeH = fontSize * 1.6;
    const badgeX = sx + sw / 2 - badgeW / 2;
    const badgeY = sy + sh + 6 / zoom;

    context.fillStyle = 'rgba(15, 23, 42, 0.88)';
    context.beginPath();
    const r = 3 / zoom;
    if (context.roundRect) {
      context.roundRect(badgeX, badgeY, badgeW, badgeH, r);
    } else {
      context.rect(badgeX, badgeY, badgeW, badgeH);
    }
    context.fill();

    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(badgeText, sx + sw / 2, badgeY + badgeH / 2);
    context.restore();
  } else {
    // For drawings and shapes, draw corner anchor dots
    context.setLineDash([]);
    context.fillStyle = '#2563eb';
    const dotR = Math.max(3, 3.5 / zoom);
    [
      { x: sx, y: sy },
      { x: sx + sw, y: sy },
      { x: sx + sw, y: sy + sh },
      { x: sx, y: sy + sh }
    ].forEach(d => {
      context.beginPath();
      context.arc(d.x, d.y, dotR, 0, Math.PI * 2);
      context.fill();
    });
  }

  context.restore();
}

function startElementDrag(el, pt) {
  selectedElement = el;
  isDraggingElement = true;
  dragStartPt = { x: pt.x, y: pt.y };
  dragStartState = serializeBoardState();

  if (el.type === 'path' && el.points) {
    dragOriginalData = {
      type: 'path',
      points: el.points.map(p => ({ x: p.x, y: p.y }))
    };
  } else if (el.type === 'image' || el.type === 'text') {
    dragOriginalData = {
      type: el.type,
      x: el.x,
      y: el.y
    };
  } else if (el.x1 !== undefined && el.x2 !== undefined) {
    dragOriginalData = {
      type: el.type,
      x1: el.x1,
      y1: el.y1,
      x2: el.x2,
      y2: el.y2
    };
  }
}

function updateElementDrag(pt) {
  if (!selectedElement || !dragOriginalData || !dragStartPt) return;
  const dx = pt.x - dragStartPt.x;
  const dy = pt.y - dragStartPt.y;

  if (dragOriginalData.type === 'path') {
    for (let i = 0; i < selectedElement.points.length; i++) {
      selectedElement.points[i].x = Math.round((dragOriginalData.points[i].x + dx) * 10) / 10;
      selectedElement.points[i].y = Math.round((dragOriginalData.points[i].y + dy) * 10) / 10;
    }
  } else if (dragOriginalData.type === 'image' || dragOriginalData.type === 'text') {
    selectedElement.x = Math.round((dragOriginalData.x + dx) * 10) / 10;
    selectedElement.y = Math.round((dragOriginalData.y + dy) * 10) / 10;
  } else {
    selectedElement.x1 = Math.round((dragOriginalData.x1 + dx) * 10) / 10;
    selectedElement.y1 = Math.round((dragOriginalData.y1 + dy) * 10) / 10;
    selectedElement.x2 = Math.round((dragOriginalData.x2 + dx) * 10) / 10;
    selectedElement.y2 = Math.round((dragOriginalData.y2 + dy) * 10) / 10;
  }
  render();
}

function startImageResize(el, handle, pt) {
  selectedElement = el;
  isResizingElement = true;
  resizeHandle = handle.id;
  resizeStartPt = { x: pt.x, y: pt.y };
  resizeStartState = serializeBoardState();
  resizeOriginalBox = {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    aspectRatio: (el.width || 1) / (el.height || 1)
  };
}

function updateImageResize(pt, shiftKey = false) {
  if (!selectedElement || !resizeOriginalBox || !resizeStartPt) return;
  const dx = pt.x - resizeStartPt.x;
  const dy = pt.y - resizeStartPt.y;
  const orig = resizeOriginalBox;
  const minDim = 24;

  let newX = orig.x;
  let newY = orig.y;
  let newW = orig.width;
  let newH = orig.height;

  // Corner handles maintain aspect ratio by default (hold Shift to unlock free resize)
  // Edge handles scale width or height independently
  const isCorner = ['nw', 'ne', 'se', 'sw'].includes(resizeHandle);
  const lockAspect = isCorner ? !shiftKey : shiftKey;

  switch (resizeHandle) {
    case 'se': {
      newW = Math.max(minDim, orig.width + dx);
      newH = lockAspect ? (newW / orig.aspectRatio) : Math.max(minDim, orig.height + dy);
      break;
    }
    case 'sw': {
      newW = Math.max(minDim, orig.width - dx);
      newH = lockAspect ? (newW / orig.aspectRatio) : Math.max(minDim, orig.height + dy);
      newX = orig.x + (orig.width - newW);
      break;
    }
    case 'ne': {
      newW = Math.max(minDim, orig.width + dx);
      newH = lockAspect ? (newW / orig.aspectRatio) : Math.max(minDim, orig.height - dy);
      newY = orig.y + (orig.height - newH);
      break;
    }
    case 'nw': {
      newW = Math.max(minDim, orig.width - dx);
      newH = lockAspect ? (newW / orig.aspectRatio) : Math.max(minDim, orig.height - dy);
      newX = orig.x + (orig.width - newW);
      newY = orig.y + (orig.height - newH);
      break;
    }
    case 'e': {
      newW = Math.max(minDim, orig.width + dx);
      break;
    }
    case 'w': {
      newW = Math.max(minDim, orig.width - dx);
      newX = orig.x + (orig.width - newW);
      break;
    }
    case 's': {
      newH = Math.max(minDim, orig.height + dy);
      break;
    }
    case 'n': {
      newH = Math.max(minDim, orig.height - dy);
      newY = orig.y + (orig.height - newH);
      break;
    }
  }

  selectedElement.x = Math.round(newX * 10) / 10;
  selectedElement.y = Math.round(newY * 10) / 10;
  selectedElement.width = Math.round(newW * 10) / 10;
  selectedElement.height = Math.round(newH * 10) / 10;
  render();
}

// Compute total bounding box of all elements on canvas
function getElementsBounds() {
  if (elements.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  elements.forEach(el => {
    const b = getElementBoundingBox(el);
    if (b) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    } else if (el.type === 'path' && el.points) {
      el.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    } else if (el.x1 !== undefined && el.x2 !== undefined) {
      minX = Math.min(minX, el.x1, el.x2);
      minY = Math.min(minY, el.y1, el.y2);
      maxX = Math.max(maxX, el.x1, el.x2);
      maxY = Math.max(maxY, el.y1, el.y2);
    }
  });

  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Fit all elements centered onto screen
function fitToScreen() {
  const bounds = getElementsBounds();
  if (!bounds || bounds.width === 0 || bounds.height === 0) {
    zoom = 1.0;
    panX = 0;
    panY = 0;
    render();
    return;
  }

  const padding = 50;
  const availW = Math.max(100, width - padding * 2);
  const availH = Math.max(100, height - padding * 2);

  const scaleX = availW / bounds.width;
  const scaleY = availH / bounds.height;
  const newZoom = Math.min(scaleX, scaleY, 1.25);

  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;

  zoom = Math.max(0.15, Math.min(3.0, newZoom));
  panX = width / 2 - cx * zoom;
  panY = height / 2 - cy * zoom;

  render();
  updateEraserCursorSize();
}

// ==================== Dropdown & Gallery Builder ====================
function populateDropdown(catalog) {
  if (optgroupExam) optgroupExam.innerHTML = '';
  optgroupIncomplete.innerHTML = '';
  optgroupComplete.innerHTML = '';
  optgroupSteps.innerHTML = '';
  optgroupExercises.innerHTML = '';

  catalog.forEach(t => {
    const opt = document.createElement('option');
    opt.value = `templates/${t.filename}`;
    opt.textContent = t.title;

    if (t.category.includes('Prova Real') && optgroupExam) {
      optgroupExam.appendChild(opt);
    } else if (t.category.includes('Incompletos')) {
      optgroupIncomplete.appendChild(opt);
    } else if (t.category.includes('Completos')) {
      optgroupComplete.appendChild(opt);
    } else if (t.category.includes('Passos')) {
      optgroupSteps.appendChild(opt);
    } else {
      optgroupExercises.appendChild(opt);
    }
  });
}

function buildGalleryModal(catalog) {
  galleryGrid.innerHTML = '';

  catalog.forEach(t => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.dataset.category = t.category;

    const badgeClass = `badge-${t.badge || 'completo'}`;

    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="card-badge ${badgeClass}">${t.badgeText || t.badge || 'Diagrama'}</span>
          <span style="font-size:10px; color:#64748b;">MIPS</span>
        </div>
        <div class="card-title">${t.title}</div>
        <div class="card-desc">${t.desc || ''}</div>
      </div>
      <button class="card-btn">
        <span>✏️ Carregar no Quadro</span>
      </button>
    `;

    card.addEventListener('click', () => {
      loadTemplateToCanvas(`templates/${t.filename}`);
      closeGalleryModal();
    });

    galleryGrid.appendChild(card);
  });
}

function openGalleryModal() {
  galleryModal.classList.add('open');
}

function closeGalleryModal() {
  galleryModal.classList.remove('open');
}

function filterGallery(category) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });

  document.querySelectorAll('.gallery-card').forEach(card => {
    if (category === 'all' || card.dataset.category === category) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// Templates Loader from Server API (with automatic fallback)
async function loadTemplateOptions() {
  try {
    const res = await fetch('/api/templates');
    if (res.ok) {
      const list = await res.json();
      if (list && list.length > 0) {
        populateDropdown(list);
        buildGalleryModal(list);
      }
    }
  } catch (err) {
    console.log('Usando catálogo estático embutido.');
  }
}

// ALWAYS adds the diagram to the board WITHOUT removing existing items
function loadTemplateToCanvas(url) {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    recordState(); // Save state for undo

    // Determine comfortable size for screen
    let maxW = Math.max(600, width * 0.85);
    let maxH = Math.max(450, height * 0.85);
    let w = img.width;
    let h = img.height;

    const scale = Math.min(maxW / w, maxH / h, 1.0);
    w = Math.round(w * scale);
    h = Math.round(h * scale);

    let posX, posY;

    if (elements.length === 0) {
      // If canvas is empty, place right in the center
      const center = screenToCanvas(width / 2, height / 2);
      posX = Math.round(center.x - w / 2);
      posY = Math.round(center.y - h / 2);
    } else {
      // If canvas already has items, place to the right of existing elements
      const bounds = getElementsBounds();
      if (bounds) {
        posX = Math.round(bounds.maxX + 80); // 80px gap to the right
        posY = Math.round(bounds.minY);       // Align with top of existing elements
      } else {
        const center = screenToCanvas(width / 2, height / 2);
        posX = Math.round(center.x - w / 2);
        posY = Math.round(center.y - h / 2);
      }
    }

    const el = {
      type: 'image',
      src: url,
      x: posX,
      y: posY,
      width: w,
      height: h,
      imgObj: img
    };

    elements.push(el);
    selectedElement = el;

    // Center and fit all elements on screen so user sees both previous work and the new diagram!
    fitToScreen();
    scheduleAutoSave();
    broadcastBoardSync();
    showToast('➕ Novo diagrama adicionado ao quadro! O conteúdo anterior foi preservado.');
    showSyncBadge('Novo diagrama adicionado!', 'synced');
  };
  img.src = url;
}

window.loadTemplateByName = function(fname) {
  studySidebar.classList.add('closed');
  sidebarBackdrop.classList.remove('active');
  loadTemplateToCanvas(`templates/${fname}`);
};

function setActiveTool(tool) {
  currentTool = tool;
  selectedElement = null;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tool-btn[data-tool="${currentTool}"]`);
  if (btn) btn.classList.add('active');

  if (currentTool === 'eraser') {
    wrapper.classList.add('eraser-mode');
    updateEraserCursorSize();
  } else {
    hideEraserCursor();
  }
  render();
}

// ==================== Mouse & Touch Event Listeners ====================
function setupEventListeners() {
  // Canvas pointer events (Suporte total a Mesa Digitalizadora / Stylus, Touch e Mouse)
  canvas.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);

  // Previne menu de contexto ao usar botão da caneta ou toque longo
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Wrapper cursor tracking
  wrapper.addEventListener('mouseleave', () => {
    hideEraserCursor();
  });
  wrapper.addEventListener('mouseenter', (e) => {
    if (currentTool === 'eraser' && !spacePressed && !isPanning) {
      const rect = canvas.getBoundingClientRect();
      updateEraserCursorPos(e.clientX - rect.left, e.clientY - rect.top);
    }
  });

  // Zoom with Wheel
  canvas.addEventListener('wheel', handleWheel, { passive: false });

  // Tool buttons
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveTool(btn.dataset.tool);
    });
  });

  // Color selection
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      currentColor = dot.dataset.color;
      updateStrokePreview();
    });
  });

  // Stroke size slider & quick preset chips
  if (strokeSizeSlider) {
    strokeSizeSlider.addEventListener('input', (e) => {
      setStrokeSize(e.target.value, false);
    });
    strokeSizeSlider.addEventListener('change', (e) => {
      setStrokeSize(e.target.value, true);
    });
  }

  document.querySelectorAll('.size-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const sz = parseFloat(chip.dataset.size);
      if (!isNaN(sz)) {
        setStrokeSize(sz, true);
      }
    });
  });

  // Clear button
  btnClearCanvas.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja limpar todo o quadro?')) {
      recordState();
      elements = [];
      selectedElement = null;
      render();
      scheduleAutoSave();
      broadcastBoardClear();
    }
  });

  // File upload input
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
    fileInput.value = '';
  });

  // Undo & Redo buttons
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  if (btnUndo) btnUndo.addEventListener('click', undo);
  if (btnRedo) btnRedo.addEventListener('click', redo);

  // Save for AI buttons
  if (btnSaveAI) {
    btnSaveAI.addEventListener('click', () => saveToAI(true, false));
  }
  if (btnSaveAIFocus) {
    btnSaveAIFocus.addEventListener('click', () => saveToAI(true, true));
  }

  // Export buttons
  if (btnExportPNG) btnExportPNG.addEventListener('click', () => {
    if (exportDropdown) exportDropdown.classList.remove('open');
    exportLocalPNG();
  });
  if (btnExportFullPNG) btnExportFullPNG.addEventListener('click', () => {
    if (exportDropdown) exportDropdown.classList.remove('open');
    exportFullPNG();
  });
  if (btnExportJSON) btnExportJSON.addEventListener('click', () => {
    if (exportDropdown) exportDropdown.classList.remove('open');
    exportBoardJSON();
  });
  if (importJsonInput) importJsonInput.addEventListener('change', (e) => {
    if (exportDropdown) exportDropdown.classList.remove('open');
    if (e.target.files && e.target.files[0]) importBoardJSON(e.target.files[0]);
    importJsonInput.value = '';
  });
  if (btnExportMenu) btnExportMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    if (exportDropdown) exportDropdown.classList.toggle('open');
  });
  window.addEventListener('click', () => {
    if (exportDropdown) exportDropdown.classList.remove('open');
  });

  // Grid toggle button
  if (btnGridToggle) {
    btnGridToggle.addEventListener('click', toggleGrid);
    const labels = { 'dots': 'Grade: Pontos', 'lines': 'Grade: Linhas', 'none': 'Grade: Nenhuma' };
    const txt = btnGridToggle.querySelector('.btn-text');
    if (txt) txt.textContent = labels[gridMode];
  }

  // Shortcuts modal
  if (btnShortcuts) btnShortcuts.addEventListener('click', openShortcutsModal);
  if (btnCloseShortcuts) btnCloseShortcuts.addEventListener('click', closeShortcutsModal);
  if (shortcutsModal) shortcutsModal.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) closeShortcutsModal();
  });

  // Instant Template Dropdown Selection (Loads immediately on change!)
  templateSelect.addEventListener('change', () => {
    const val = templateSelect.value;
    if (val) {
      loadTemplateToCanvas(val);
      templateSelect.value = ''; // reset select so it can be re-triggered anytime
    }
  });

  // Gallery Modal Buttons
  btnOpenGallery.addEventListener('click', openGalleryModal);
  btnCloseGallery.addEventListener('click', closeGalleryModal);

  galleryModal.addEventListener('click', (e) => {
    if (e.target === galleryModal) closeGalleryModal();
  });

  // Filter Buttons in Modal
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filterGallery(btn.dataset.category);
    });
  });

  // Toggle Palette Collapse
  btnTogglePalette.addEventListener('click', () => {
    toolPalette.classList.toggle('collapsed');
    btnTogglePalette.textContent = toolPalette.classList.contains('collapsed') ? '▶' : '◀';
    setTimeout(resizeCanvas, 220);
  });

  // Zoom HUD
  btnZoomIn.addEventListener('click', () => applyZoom(1.2));
  btnZoomOut.addEventListener('click', () => applyZoom(1 / 1.2));
  btnZoomReset.addEventListener('click', () => {
    zoom = 1.0;
    panX = 0;
    panY = 0;
    render();
  });
  btnZoomFit.addEventListener('click', fitToScreen);

  // Sidebar Controls
  btnToggleSidebar.addEventListener('click', () => {
    const isClosed = studySidebar.classList.contains('closed');
    if (isClosed) {
      studySidebar.classList.remove('closed');
      sidebarBackdrop.classList.add('active');
    } else {
      studySidebar.classList.add('closed');
      sidebarBackdrop.classList.remove('active');
    }
  });

  btnCloseSidebar.addEventListener('click', () => {
    studySidebar.classList.add('closed');
    sidebarBackdrop.classList.remove('active');
  });

  sidebarBackdrop.addEventListener('click', () => {
    studySidebar.classList.add('closed');
    sidebarBackdrop.classList.remove('active');
  });

  // Sidebar Tabs
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Clipboard Paste (Ctrl+V) anywhere on the window!
  window.addEventListener('paste', handleClipboardPaste);

  // Drag and Drop files onto canvas
  wrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  wrapper.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const pt = screenToCanvas(e.clientX - wrapper.getBoundingClientRect().left, e.clientY - wrapper.getBoundingClientRect().top);
        addImageFromFile(file, pt.x, pt.y);
      }
    }
  });

  // Refresh AI Feedback
  const btnRefreshFeedback = document.getElementById('btnRefreshFeedback');
  if (btnRefreshFeedback) {
    btnRefreshFeedback.addEventListener('click', fetchAIFeedback);
  }
}

// ==================== Stroke Smoothing & Geometry Algorithms ====================

/**
 * Online Real-Time Stream Stabilizer
 * Uses adaptive Exponential Moving Average (EMA) to eliminate high-frequency mouse jitter
 * while remaining snappy and responsive on fast sweeps.
 */
const strokeSmoother = {
  active: false,
  lastSmoothed: null,
  reset(initialPt) {
    this.active = true;
    this.lastSmoothed = initialPt ? { x: initialPt.x, y: initialPt.y } : null;
  },
  smooth(rawPt) {
    if (!this.active || !this.lastSmoothed) {
      this.reset(rawPt);
      return { x: rawPt.x, y: rawPt.y };
    }
    const dx = rawPt.x - this.lastSmoothed.x;
    const dy = rawPt.y - this.lastSmoothed.y;
    const dist = Math.hypot(dx, dy);

    // High fidelity stroke smoothing:
    // Only dampens microscopic jitter (< 2px) while following the cursor immediately
    // with 0 perceived lag (alpha reaches 1.0 for strokes >= 4px).
    const alpha = Math.min(1.0, Math.max(0.78, dist / 4));
    const sx = this.lastSmoothed.x + dx * alpha;
    const sy = this.lastSmoothed.y + dy * alpha;
    this.lastSmoothed = { x: sx, y: sy };
    return { x: sx, y: sy };
  },
  finish() {
    this.active = false;
    this.lastSmoothed = null;
  }
};

/**
 * Ramer-Douglas-Peucker Polyline Simplification
 * Keeps the file size compact and removes redundant micro-points without losing shape fidelity.
 */
function simplifyPolyline(points, tolerance = 0.6) {
  if (!points || points.length <= 2) return points;
  function getSqSegDist(p, p1, p2) {
    let x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = p2.x; y = p2.y; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p.x - x; dy = p.y - y;
    return dx * dx + dy * dy;
  }
  function simplifyDPStep(pts, first, last, sqTol, simplified) {
    let maxSqDist = sqTol, index = -1;
    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegDist(pts[i], pts[first], pts[last]);
      if (sqDist > maxSqDist) { index = i; maxSqDist = sqDist; }
    }
    if (index !== -1) {
      if (index - first > 1) simplifyDPStep(pts, first, index, sqTol, simplified);
      simplified.push(pts[index]);
      if (last - index > 1) simplifyDPStep(pts, index, last, sqTol, simplified);
    }
  }
  const sqTol = tolerance * tolerance;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, points.length - 1, sqTol, simplified);
  simplified.push(points[points.length - 1]);
  return simplified;
}


// Pointer event handlers
function handlePointerDown(e) {
  // Captura o ponteiro e previne comportamentos de arrasto/gestos nativos do Windows Ink / touch
  if (e.pointerId !== undefined && canvas.setPointerCapture) {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {}
  }
  if (e.cancelable) {
    e.preventDefault();
  }

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Spacebar pan or middle click or pan tool
  if (spacePressed || e.button === 1 || currentTool === 'pan') {
    isPanning = true;
    startPanX = e.clientX - panX;
    startPanY = e.clientY - panY;
    wrapper.classList.add('panning');
    hideEraserCursor();
    return;
  }

  const pt = screenToCanvas(mouseX, mouseY);
  startX = pt.x;
  startY = pt.y;

  if (currentTool === 'select') {
    // 1. Check if clicking on an image resize handle
    if (selectedElement && selectedElement.type === 'image') {
      const handle = hitTestResizeHandle(selectedElement, pt.x, pt.y);
      if (handle) {
        startImageResize(selectedElement, handle, pt);
        render();
        return;
      }
    }

    // 2. Check if clicking inside already selected element
    if (selectedElement && hitTestElement(selectedElement, pt.x, pt.y)) {
      startElementDrag(selectedElement, pt);
      render();
      return;
    }

    // 3. Hit test all elements from top to bottom (highest z-index first)
    selectedElement = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (hitTestElement(el, pt.x, pt.y)) {
        selectedElement = el;
        startElementDrag(el, pt);
        break;
      }
    }
    render();
    return;
  }

  if (currentTool === 'text') {
    promptAddText(mouseX, mouseY, pt.x, pt.y);
    return;
  }

  if (currentTool === 'eraser') {
    eraseStartState = serializeBoardState();
    eraseModified = false;
    lastErasePoint = { x: pt.x, y: pt.y };
    isDrawing = true;
    const radius = getEraserRadius();
    if (eraseCircleStep(pt.x, pt.y, radius)) {
      eraseModified = true;
      render();
    }
    return;
  }

  // Draw tools: pen, highlighter, line, arrow, rect, mux, alu
  isDrawing = true;
  drawStartState = serializeBoardState();

  if (currentTool === 'pen' || currentTool === 'highlighter') {
    strokeSmoother.reset(pt);
    currentPath = {
      type: 'path',
      tool: currentTool,
      color: currentColor,
      size: currentSize,
      points: [{ x: pt.x, y: pt.y }]
    };
  } else {
    currentPath = {
      type: currentTool,
      color: currentColor,
      size: currentSize,
      x1: pt.x,
      y1: pt.y,
      x2: pt.x,
      y2: pt.y
    };
  }

  render();
}

function handlePointerMove(e) {
  if (isDrawing || isPanning || isDraggingElement || isResizingElement) {
    if (e.cancelable) e.preventDefault();
  }

  if (isPanning) {
    panX = e.clientX - startPanX;
    panY = e.clientY - startPanY;
    hideEraserCursor();
    render();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const isInside = mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height;

  if (currentTool === 'eraser' && !spacePressed) {
    if (isInside) {
      updateEraserCursorPos(mouseX, mouseY);
    } else {
      hideEraserCursor();
    }
  } else {
    hideEraserCursor();
  }

  const pt = screenToCanvas(mouseX, mouseY);

  if (isInside || isDrawing || isDraggingElement || isResizingElement) {
    broadcastCursor(pt.x, pt.y);
  }

  // Active Image Resizing
  if (isResizingElement && selectedElement) {
    updateImageResize(pt, e.shiftKey);
    return;
  }

  // Active Element Dragging (Moving)
  if (isDraggingElement && selectedElement) {
    updateElementDrag(pt);
    return;
  }

  // Hover cursor management for selection tool
  if (currentTool === 'select' && !isDrawing && !isDraggingElement && !isResizingElement && !spacePressed) {
    if (selectedElement && selectedElement.type === 'image') {
      const handle = hitTestResizeHandle(selectedElement, pt.x, pt.y);
      if (handle) {
        canvas.style.cursor = handle.cursor;
      } else if (hitTestElement(selectedElement, pt.x, pt.y)) {
        canvas.style.cursor = 'move';
      } else {
        let overOther = false;
        for (let i = elements.length - 1; i >= 0; i--) {
          if (hitTestElement(elements[i], pt.x, pt.y)) {
            overOther = true;
            break;
          }
        }
        canvas.style.cursor = overOther ? 'pointer' : 'default';
      }
    } else {
      let overAny = false;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (hitTestElement(elements[i], pt.x, pt.y)) {
          overAny = true;
          break;
        }
      }
      canvas.style.cursor = overAny ? (selectedElement ? 'move' : 'pointer') : 'default';
    }
  } else if (currentTool !== 'eraser' && !spacePressed) {
    canvas.style.cursor = '';
  }

  if (!isDrawing) return;

  if (currentTool === 'eraser') {
    if (lastErasePoint) {
      eraseAlongSegment(lastErasePoint.x, lastErasePoint.y, pt.x, pt.y);
      lastErasePoint = { x: pt.x, y: pt.y };
    } else {
      lastErasePoint = { x: pt.x, y: pt.y };
      const radius = getEraserRadius();
      if (eraseCircleStep(pt.x, pt.y, radius)) {
        eraseModified = true;
        render();
      }
    }
    return;
  }

  if (currentPath) {
    if (currentPath.type === 'path') {
      const subEvents = (e.getCoalescedEvents && typeof e.getCoalescedEvents === 'function')
        ? e.getCoalescedEvents()
        : [e];
      const minDistance = Math.max(1.0, 1.6 / zoom);
      for (const ev of subEvents) {
        const subMouseX = ev.clientX - rect.left;
        const subMouseY = ev.clientY - rect.top;
        const rawPt = screenToCanvas(subMouseX, subMouseY);
        const smoothedPt = strokeSmoother.smooth(rawPt);
        const lastPt = currentPath.points[currentPath.points.length - 1];
        if (!lastPt || Math.hypot(smoothedPt.x - lastPt.x, smoothedPt.y - lastPt.y) >= minDistance) {
          currentPath.points.push({
            x: Math.round(smoothedPt.x * 10) / 10,
            y: Math.round(smoothedPt.y * 10) / 10
          });
        }
      }
      broadcastLiveStroke(currentPath);
    } else {
      currentPath.x2 = pt.x;
      currentPath.y2 = pt.y;
    }
    render();
  }
}

function handlePointerUp(e) {
  if (e && e.pointerId !== undefined && canvas.releasePointerCapture) {
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}
  }

  const rect = canvas.getBoundingClientRect();
  const mouseX = (e ? e.clientX : 0) - rect.left;
  const mouseY = (e ? e.clientY : 0) - rect.top;
  const pt = screenToCanvas(mouseX, mouseY);

  if (isPanning) {
    isPanning = false;
    wrapper.classList.remove('panning');
    if (currentTool === 'eraser') {
      wrapper.classList.add('eraser-mode');
    }
  }

  if (isResizingElement) {
    isResizingElement = false;
    resizeHandle = null;
    if (selectedElement && resizeOriginalBox && resizeStartState) {
      if (Math.abs(selectedElement.width - resizeOriginalBox.width) > 1 ||
          Math.abs(selectedElement.height - resizeOriginalBox.height) > 1 ||
          Math.abs(selectedElement.x - resizeOriginalBox.x) > 1 ||
          Math.abs(selectedElement.y - resizeOriginalBox.y) > 1) {
        pushUndoState(resizeStartState);
        scheduleAutoSave();
        commitLocalAction();
      }
    }
    resizeStartState = null;
    resizeOriginalBox = null;
  }

  if (isDraggingElement) {
    isDraggingElement = false;
    if (selectedElement && dragStartPt && dragStartState) {
      const dist = Math.hypot(pt.x - dragStartPt.x, pt.y - dragStartPt.y);
      if (dist > 1.5) {
        pushUndoState(dragStartState);
        scheduleAutoSave();
        commitLocalAction();
      }
    }
    dragStartState = null;
    dragStartPt = null;
    dragOriginalData = null;
  }

  if (currentTool === 'eraser') {
    if (isDrawing) {
      isDrawing = false;
      lastErasePoint = null;
      if (eraseModified && eraseStartState) {
        pushUndoState(eraseStartState);
        eraseStartState = null;
        scheduleAutoSave();
        broadcastBoardSync();
      }
    }
    return;
  }

  if (isDrawing) {
    isDrawing = false;
    if (currentPath) {
      let isValid = false;
      if (currentPath.type === 'path') {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e ? e.clientX : 0) - rect.left;
        const mouseY = (e ? e.clientY : 0) - rect.top;
        const finalRawPt = screenToCanvas(mouseX, mouseY);
        strokeSmoother.finish();

        // Ensure final point is accurately represented
        if (currentPath.points.length > 1) {
          const lastPt = currentPath.points[currentPath.points.length - 1];
          if (Math.hypot(finalRawPt.x - lastPt.x, finalRawPt.y - lastPt.y) >= 1.5) {
            currentPath.points.push({
              x: Math.round(finalRawPt.x * 10) / 10,
              y: Math.round(finalRawPt.y * 10) / 10
            });
          }
        }

        // Gentle simplification to remove micro-collinear duplicates without altering curves or corners
        currentPath.points = simplifyPolyline(currentPath.points, 0.25);
        currentPath.points.forEach(p => {
          p.x = Math.round(p.x * 10) / 10;
          p.y = Math.round(p.y * 10) / 10;
        });

        isValid = currentPath.points.length >= 1;
      } else {
        const dist = Math.hypot(currentPath.x2 - currentPath.x1, currentPath.y2 - currentPath.y1);
        isValid = dist >= 3;
      }

      if (isValid) {
        if (drawStartState) {
          pushUndoState(drawStartState);
          drawStartState = null;
        }
        const createdEl = currentPath;
        elements.push(createdEl);
        currentPath = null;
        render();
        scheduleAutoSave();
        broadcastElementAdd(createdEl);
      } else {
        // Discard zero-length element without affecting undo/redo stacks
        currentPath = null;
        drawStartState = null;
        render();
      }
    }
  }
}

// Wheel Zoom
function handleWheel(e) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const newZoom = Math.min(Math.max(0.15, zoom * zoomFactor), 5.0);

  // Zoom toward cursor position
  panX = mouseX - (mouseX - panX) * (newZoom / zoom);
  panY = mouseY - (mouseY - panY) * (newZoom / zoom);
  zoom = newZoom;

  render();
  updateEraserCursorSize();
}

function applyZoom(factor) {
  const centerX = width / 2;
  const centerY = height / 2;
  const newZoom = Math.min(Math.max(0.15, zoom * factor), 5.0);

  panX = centerX - (centerX - panX) * (newZoom / zoom);
  panY = centerY - (centerY - panY) * (newZoom / zoom);
  zoom = newZoom;

  render();
  updateEraserCursorSize();
}

function updateZoomIndicator() {
  zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
}

// ==================== Precise Circle Eraser System ====================
let lastErasePoint = null;
let eraseStartState = null;
let eraseModified = false;
const eraserCursor = document.getElementById('eraserCursor');

function getEraserRadius() {
  return Math.round(Math.max(10, Math.min(80, currentSize * 2.2 + 8)));
}

function updateEraserCursorPos(screenX, screenY) {
  if (!eraserCursor) return;
  if (currentTool !== 'eraser' || spacePressed || isPanning) {
    eraserCursor.style.display = 'none';
    wrapper.classList.remove('eraser-mode');
    return;
  }
  const radius = getEraserRadius();
  const screenRadius = radius * zoom;
  const d = Math.round(screenRadius * 2);

  eraserCursor.style.width = `${d}px`;
  eraserCursor.style.height = `${d}px`;
  eraserCursor.style.left = `${screenX}px`;
  eraserCursor.style.top = `${screenY}px`;
  eraserCursor.style.display = 'block';
  wrapper.classList.add('eraser-mode');
}

function updateEraserCursorSize() {
  if (!eraserCursor) return;
  if (currentTool !== 'eraser' || spacePressed || isPanning) {
    eraserCursor.style.display = 'none';
    wrapper.classList.remove('eraser-mode');
    return;
  }
  const radius = getEraserRadius();
  const screenRadius = radius * zoom;
  const d = Math.round(screenRadius * 2);
  eraserCursor.style.width = `${d}px`;
  eraserCursor.style.height = `${d}px`;
}

function hideEraserCursor() {
  if (!eraserCursor) return;
  eraserCursor.style.display = 'none';
  wrapper.classList.remove('eraser-mode');
}

// Clip polyline path against circle (erases only what is strictly inside the circle)
function clipPathByCircle(pathEl, cx, cy, radius) {
  if (!pathEl.points || pathEl.points.length === 0) return [];

  if (pathEl.points.length === 1) {
    const d = Math.hypot(pathEl.points[0].x - cx, pathEl.points[0].y - cy);
    return d < radius ? [] : [pathEl];
  }

  // Fast bounding box rejection check
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < pathEl.points.length; i++) {
    const p = pathEl.points[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = (pathEl.size || 2);
  if (cx + radius < minX - pad || cx - radius > maxX + pad ||
      cy + radius < minY - pad || cy - radius > maxY + pad) {
    return [pathEl];
  }

  const resultPaths = [];
  let currentSub = [];

  function pushSub(pts) {
    if (!pts || pts.length === 0) return;
    const clean = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const prev = clean[clean.length - 1];
      const curr = pts[k];
      if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 0.05) {
        clean.push(curr);
      }
    }
    if (clean.length >= 2) {
      resultPaths.push(clean);
    } else if (clean.length === 1) {
      resultPaths.push([clean[0], { x: clean[0].x + 0.1, y: clean[0].y + 0.1 }]);
    }
  }

  const p0 = pathEl.points[0];
  if (Math.hypot(p0.x - cx, p0.y - cy) >= radius) {
    currentSub.push(p0);
  }

  for (let i = 0; i < pathEl.points.length - 1; i++) {
    const A = pathEl.points[i];
    const B = pathEl.points[i + 1];

    const Dx = B.x - A.x;
    const Dy = B.y - A.y;
    const a = Dx * Dx + Dy * Dy;

    if (a < 1e-9) continue;

    const Fx = A.x - cx;
    const Fy = A.y - cy;
    const b = 2 * (Dx * Fx + Dy * Fy);
    const c = Fx * Fx + Fy * Fy - radius * radius;
    const delta = b * b - 4 * a * c;

    if (delta <= 0) {
      if (currentSub.length === 0) currentSub.push(A);
      currentSub.push(B);
      continue;
    }

    const sqrtDelta = Math.sqrt(delta);
    const t1 = (-b - sqrtDelta) / (2 * a);
    const t2 = (-b + sqrtDelta) / (2 * a);

    const tInStart = Math.max(0, t1);
    const tInEnd = Math.min(1, t2);

    if (tInStart >= tInEnd) {
      if (currentSub.length === 0) currentSub.push(A);
      currentSub.push(B);
      continue;
    }

    // Entering or cutting circle
    if (t1 > 1e-6) {
      if (currentSub.length === 0) currentSub.push(A);
      const I1 = { x: A.x + t1 * Dx, y: A.y + t1 * Dy };
      currentSub.push(I1);
      pushSub(currentSub);
      currentSub = [];
    } else {
      if (currentSub.length > 0) {
        pushSub(currentSub);
        currentSub = [];
      }
    }

    // Exiting circle
    if (t2 < 1 - 1e-6) {
      const I2 = { x: A.x + t2 * Dx, y: A.y + t2 * Dy };
      currentSub = [I2, B];
    } else {
      currentSub = [];
    }
  }

  if (currentSub.length > 0) {
    pushSub(currentSub);
  }

  return resultPaths.map(pts => ({ ...pathEl, points: pts }));
}

// Clip straight line or arrow against circle
function clipLineOrArrow(el, cx, cy, radius) {
  const A = { x: el.x1, y: el.y1 };
  const B = { x: el.x2, y: el.y2 };
  const Dx = B.x - A.x;
  const Dy = B.y - A.y;
  const a = Dx * Dx + Dy * Dy;

  if (a < 1e-9) {
    const d = Math.hypot(A.x - cx, A.y - cy);
    return d < radius ? [] : [el];
  }

  const Fx = A.x - cx;
  const Fy = A.y - cy;
  const b = 2 * (Dx * Fx + Dy * Fy);
  const c = Fx * Fx + Fy * Fy - radius * radius;
  const delta = b * b - 4 * a * c;

  if (delta <= 0) return [el];

  const sqrtDelta = Math.sqrt(delta);
  const t1 = (-b - sqrtDelta) / (2 * a);
  const t2 = (-b + sqrtDelta) / (2 * a);

  const tInStart = Math.max(0, t1);
  const tInEnd = Math.min(1, t2);

  if (tInStart >= tInEnd) return [el];

  const hasStart = t1 > 1e-6;
  const hasEnd = t2 < 1 - 1e-6;
  const I1 = { x: A.x + t1 * Dx, y: A.y + t1 * Dy };
  const I2 = { x: A.x + t2 * Dx, y: A.y + t2 * Dy };

  if (hasStart && hasEnd) {
    // Cut in middle: split into two pieces
    if (el.type === 'arrow') {
      return [
        { type: 'line', color: el.color, size: el.size, x1: el.x1, y1: el.y1, x2: I1.x, y2: I1.y },
        { ...el, x1: I2.x, y1: I2.y, x2: el.x2, y2: el.y2 }
      ];
    }
    return [
      { ...el, x1: el.x1, y1: el.y1, x2: I1.x, y2: I1.y },
      { ...el, x1: I2.x, y1: I2.y, x2: el.x2, y2: el.y2 }
    ];
  } else if (hasStart) {
    // End trimmed
    if (el.type === 'arrow') {
      return [{ type: 'line', color: el.color, size: el.size, x1: el.x1, y1: el.y1, x2: I1.x, y2: I1.y }];
    }
    return [{ ...el, x1: el.x1, y1: el.y1, x2: I1.x, y2: I1.y }];
  } else if (hasEnd) {
    // Start trimmed
    return [{ ...el, x1: I2.x, y1: I2.y, x2: el.x2, y2: el.y2 }];
  } else {
    // Entire line inside circle
    return [];
  }
}

// Single step of circle erasing
function eraseCircleStep(cx, cy, radius) {
  let changed = false;
  const newElements = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    // IMPORTANT: Ready images added to the board are NEVER erased by the eraser!
    if (el.type === 'image') {
      newElements.push(el);
      continue;
    }

    if (el.type === 'path') {
      const clipped = clipPathByCircle(el, cx, cy, radius);
      if (clipped.length !== 1 || clipped[0] !== el) {
        changed = true;
      }
      for (let k = 0; k < clipped.length; k++) {
        newElements.push(clipped[k]);
      }
    } else if (el.type === 'line' || el.type === 'arrow') {
      const clipped = clipLineOrArrow(el, cx, cy, radius);
      if (clipped.length !== 1 || clipped[0] !== el) {
        changed = true;
      }
      for (let k = 0; k < clipped.length; k++) {
        newElements.push(clipped[k]);
      }
    } else if (el.type === 'rect' || el.type === 'mux' || el.type === 'alu' || el.type === 'text') {
      const bbox = getElementBoundingBox(el);
      if (bbox && cx >= bbox.x && cx <= bbox.x + bbox.width && cy >= bbox.y && cy <= bbox.y + bbox.height) {
        changed = true;
        // removed
      } else {
        newElements.push(el);
      }
    } else {
      newElements.push(el);
    }
  }

  if (changed) {
    elements = newElements;
    if (selectedElement && !elements.includes(selectedElement)) {
      selectedElement = null;
    }
  }
  return changed;
}

// Erase along drag segment with interpolation so fast mouse movement leaves no gaps
function eraseAlongSegment(x1, y1, x2, y2) {
  const radius = getEraserRadius();
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const step = Math.max(4, radius * 0.4);
  const steps = Math.max(1, Math.ceil(dist / step));
  let anyChange = false;

  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;
    if (eraseCircleStep(cx, cy, radius)) {
      anyChange = true;
    }
  }

  if (anyChange) {
    eraseModified = true;
    render();
  }
}

// Text Input on Canvas
function promptAddText(screenX, screenY, canvasX, canvasY) {
  const existingInput = document.getElementById('canvasTextInput');
  if (existingInput) existingInput.remove();

  const rect = wrapper.getBoundingClientRect();
  const input = document.createElement('textarea');
  input.id = 'canvasTextInput';
  input.style.position = 'absolute';
  input.style.left = `${screenX + rect.left}px`;
  input.style.top = `${screenY + rect.top}px`;
  const fontSize = Math.round(Math.max(12, Math.min(48, currentSize * 2 + 12)));
  input.style.fontSize = `${fontSize}px`;
  input.style.color = currentColor;
  input.style.background = 'rgba(255, 255, 255, 0.96)';
  input.style.border = '2px solid #3b82f6';
  input.style.borderRadius = '4px';
  input.style.padding = '4px 8px';
  input.style.fontFamily = "'Fira Code', monospace";
  input.style.zIndex = '35';
  input.style.minWidth = '180px';
  input.style.minHeight = '36px';
  input.placeholder = 'Digite seu cálculo ou sinal...';

  document.body.appendChild(input);
  input.focus();

  let committed = false;

  function commitText() {
    if (committed) return;
    committed = true;
    const text = input.value.trim();
    if (text) {
      recordState();
      const textEl = {
        type: 'text',
        text: text,
        x: canvasX,
        y: canvasY,
        color: currentColor,
        size: currentSize
      };
      elements.push(textEl);
      render();
      scheduleAutoSave();
      broadcastElementAdd(textEl);
    }
    if (input.parentNode) {
      input.remove();
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitText();
    } else if (e.key === 'Escape') {
      committed = true;
      if (input.parentNode) input.remove();
    }
  });

  input.addEventListener('blur', commitText);
}

// Paste Image from Clipboard (Ctrl+V)
function handleClipboardPaste(e) {
  if (e.clipboardData && e.clipboardData.items) {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        const center = screenToCanvas(width / 2, height / 2);
        addImageFromFile(file, center.x, center.y);
        showSyncBadge('Imagem colada com sucesso!', 'synced');
        break;
      }
    }
  }
}

function addImageFromFile(file, posX, posY) {
  const reader = new FileReader();
  reader.onload = async (event) => {
    const rawDataUrl = event.target.result;
    let finalSrc = rawDataUrl;

    // Fast upload to backend to store clean URL instead of huge base64
    try {
      showSyncBadge('Enviando imagem...', 'saving');
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: rawDataUrl })
      });
      if (upRes.ok) {
        const upData = await upRes.json();
        if (upData.url) {
          finalSrc = upData.url;
        }
      }
    } catch (err) {
      console.warn('Upload offline, usando fallback local:', err);
    }

    const img = new Image();
    img.onload = () => {
      let maxDim = Math.min(850, width * 0.8);
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w *= scale;
        h *= scale;
      }

      const x = posX !== undefined ? posX - w / 2 : (width / 2 - panX) / zoom - w / 2;
      const y = posY !== undefined ? posY - h / 2 : (height / 2 - panY) / zoom - h / 2;

      recordState();
      const el = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        type: 'image',
        src: finalSrc,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
        imgObj: img
      };
      elements.push(el);
      setActiveTool('select');
      selectedElement = el;
      render();
      scheduleAutoSave();
      broadcastElementAdd({
        id: el.id,
        type: 'image',
        src: finalSrc,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height
      });
      showSyncBadge('Imagem pronta!', 'synced');
    };
    img.src = finalSrc;
  };
  reader.readAsDataURL(file);
}

// Local Auto-Save (Saves vector state locally in browser; does NOT generate image prints to disk!)
function scheduleAutoSave() {
  showSyncBadge('● Salvo no navegador', 'synced');
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    try {
      const serializableElements = elements.map(el => {
        const copy = { ...el };
        delete copy.imgObj;
        return copy;
      });
      const stateObj = { elements: serializableElements, zoom, panX, panY };
      localStorage.setItem('whiteboard_state', JSON.stringify(stateObj));

      // Quietly sync JSON elements state to server without any image/print generation
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateObj })
      }).catch(() => {});
    } catch (e) {}
  }, 600);
}

async function saveToAI(manual = false, focusMode = false) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  showSyncBadge(focusMode ? 'Salvando foco...' : 'Sincronizando com IA...', 'saving');

  try {
    const exportCanvas = document.createElement('canvas');
    const expCtx = exportCanvas.getContext('2d');

    let expW, expH;

    if (focusMode) {
      // Focus Mode: Captures exactly what the user is seeing on screen right now
      expW = Math.min(2048, Math.round(width));
      expH = Math.min(1536, Math.round(height));
      exportCanvas.width = expW;
      exportCanvas.height = expH;

      expCtx.fillStyle = '#ffffff';
      expCtx.fillRect(0, 0, expW, expH);

      expCtx.translate(panX, panY);
      expCtx.scale(zoom, zoom);
      elements.forEach(el => drawElement(expCtx, el));
    } else {
      // Full Board Mode: bounded, downscaled if large
      const bounds = getElementsBounds() || { minX: 0, minY: 0, maxX: width, maxY: height, width, height };
      const padding = 50;
      const rawW = Math.max(800, bounds.width + padding * 2);
      const rawH = Math.max(600, bounds.height + padding * 2);

      // Clamp max dimensions to 2560x1600 so it NEVER becomes a 106MP decompression bomb
      const MAX_W = 2560;
      const MAX_H = 1600;
      const scale = Math.min(MAX_W / rawW, MAX_H / rawH, 1.0);

      expW = Math.round(rawW * scale);
      expH = Math.round(rawH * scale);

      exportCanvas.width = expW;
      exportCanvas.height = expH;

      expCtx.fillStyle = '#ffffff';
      expCtx.fillRect(0, 0, expW, expH);

      expCtx.scale(scale, scale);
      expCtx.translate(-bounds.minX + padding, -bounds.minY + padding);
      elements.forEach(el => drawElement(expCtx, el));
    }

    const dataUrl = exportCanvas.toDataURL('image/png');

    // Clean elements for JSON serialization
    const serializableElements = elements.map(el => {
      const copy = { ...el };
      delete copy.imgObj;
      return copy;
    });

    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dataUrl,
        state: { elements: serializableElements, zoom, panX, panY }
      })
    });

    if (res.ok) {
      showSyncBadge('● Sincronizado com IA', 'synced');
      if (manual) {
        showToast(focusMode ? '🎯 Foco atual salvo para a IA!' : '✅ Quadro salvo e visível para a IA! Pode me chamar no chat.');
      }
    } else {
      showSyncBadge('Erro ao salvar', 'idle');
    }
  } catch (err) {
    showSyncBadge('Servidor offline', 'idle');
  }
}

function showSyncBadge(text, className) {
  syncText.textContent = text;
  syncBadge.className = `sync-badge ${className}`;
}

function showToast(msg) {
  const existing = document.getElementById('toastNotification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toastNotification';
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = '#1e293b';
  toast.style.color = '#f8fafc';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '8px';
  toast.style.border = '1px solid #3b82f6';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
  toast.style.fontSize = '12px';
  toast.style.fontWeight = '500';
  toast.style.zIndex = '200';
  toast.textContent = msg;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

async function loadSavedBoard() {
  // 1. First restore from localStorage (instant and offline)
  try {
    const local = localStorage.getItem('whiteboard_state');
    if (local) {
      const data = JSON.parse(local);
      if (data && data.elements && data.elements.length > 0) {
        elements = data.elements;
        if (data.zoom) zoom = data.zoom;
        if (data.panX !== undefined) panX = data.panX;
        if (data.panY !== undefined) panY = data.panY;
        rehydrateImages();
        setTimeout(() => {
          render();
          showSyncBadge('● Salvo no navegador', 'synced');
        }, 100);
        return;
      }
    }
  } catch (e) {}

  // 2. Fallback to /current_board.json from server
  try {
    const res = await fetch('/current_board.json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.elements) {
        elements = data.elements;
        rehydrateImages();
        setTimeout(() => {
          fitToScreen();
          showSyncBadge('● Sincronizado', 'synced');
        }, 150);
      }
    }
  } catch (e) {
    // board file doesn't exist yet
  }
}

function exportLocalPNG() {
  const link = document.createElement('a');
  link.download = `whiteboard_mips_tela_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('📥 Imagem da tela baixada com sucesso!');
}

function exportFullPNG() {
  const bounds = getElementsBounds() || { minX: 0, minY: 0, maxX: width, maxY: height, width, height };
  const padding = 50;
  const rawW = Math.max(800, bounds.width + padding * 2);
  const rawH = Math.max(600, bounds.height + padding * 2);
  const scale = Math.min(3200 / rawW, 2400 / rawH, 1.0);

  const expCanvas = document.createElement('canvas');
  expCanvas.width = Math.round(rawW * scale);
  expCanvas.height = Math.round(rawH * scale);
  const expCtx = expCanvas.getContext('2d');

  expCtx.fillStyle = '#ffffff';
  expCtx.fillRect(0, 0, expCanvas.width, expCanvas.height);
  expCtx.scale(scale, scale);
  expCtx.translate(-bounds.minX + padding, -bounds.minY + padding);
  elements.forEach(el => drawElement(expCtx, el));

  const link = document.createElement('a');
  link.download = `quadro_mips_completo_${Date.now()}.png`;
  link.href = expCanvas.toDataURL('image/png');
  link.click();
  showToast('📥 Imagem completa baixada com sucesso!');
}

function exportBoardJSON() {
  const serializableElements = elements.map(el => {
    const copy = { ...el };
    delete copy.imgObj;
    return copy;
  });
  const data = JSON.stringify({
    version: '2.0',
    exportedAt: new Date().toISOString(),
    zoom,
    panX,
    panY,
    elements: serializableElements
  }, null, 2);

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `quadro_mips_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 Backup do quadro baixado com sucesso!');
}

function importBoardJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data && data.elements && Array.isArray(data.elements)) {
        recordState();
        elements = data.elements;
        ensureElementIds();
        if (data.zoom) zoom = data.zoom;
        if (data.panX !== undefined) panX = data.panX;
        if (data.panY !== undefined) panY = data.panY;
        rehydrateImages();
        render();
        scheduleAutoSave();
        broadcastBoardSync();
        showToast(`📂 Backup restaurado com sucesso! (${elements.length} elementos)`);
      } else {
        alert('Arquivo JSON inválido.');
      }
    } catch (err) {
      alert('Erro ao carregar arquivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function toggleGrid() {
  if (gridMode === 'dots') gridMode = 'lines';
  else if (gridMode === 'lines') gridMode = 'none';
  else gridMode = 'dots';

  localStorage.setItem('whiteboard_grid', gridMode);
  if (btnGridToggle) {
    const labels = { 'dots': 'Grade: Pontos', 'lines': 'Grade: Linhas', 'none': 'Grade: Nenhuma' };
    const txt = btnGridToggle.querySelector('.btn-text');
    if (txt) txt.textContent = labels[gridMode];
  }
  render();
  const desc = gridMode === 'dots' ? 'Pontilhado' : gridMode === 'lines' ? 'Linhas' : 'Sem grade';
  showToast(`⊞ Grade: ${desc}`);
}

function openShortcutsModal() {
  if (shortcutsModal) shortcutsModal.classList.add('open');
}

function closeShortcutsModal() {
  if (shortcutsModal) shortcutsModal.classList.remove('open');
}

async function fetchAIFeedback() {
  try {
    const res = await fetch('/api/ai-feedback');
    const data = await res.json();
    const box = document.getElementById('aiFeedbackContainer');
    if (data.notes && data.notes.length > 0) {
      box.innerHTML = data.notes.map(n => `
        <div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #334155;">
          <b style="color:#60a5fa;">[${n.author || 'Assistente IA'}]:</b>
          <p style="color:#f1f5f9; margin-top:2px;">${n.text}</p>
        </div>
      `).join('');
    } else {
      box.innerHTML = '<i>Nenhuma anotação nova da IA no momento.</i>';
    }
  } catch (e) {
    console.warn('Feedback indisponível:', e);
  }
}

// Hotkeys & Shortcuts
function setupHotkeys() {
  window.addEventListener('keydown', (e) => {
    // Ignore hotkeys when typing in textarea or inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Escape') {
      closeGalleryModal();
      closeShortcutsModal();
      studySidebar.classList.add('closed');
      sidebarBackdrop.classList.remove('active');
      if (exportDropdown) exportDropdown.classList.remove('open');
    }

    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      openShortcutsModal();
      return;
    }

    if (e.shiftKey && (e.key === 'G' || e.key === 'g')) {
      toggleGrid();
      return;
    }

    if (e.code === 'Space') {
      spacePressed = true;
      wrapper.classList.add('pan-mode');
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveToAI(true);
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        redo();
      }
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedElement) {
        recordState();
        elements = elements.filter(el => el !== selectedElement);
        selectedElement = null;
        render();
        scheduleAutoSave();
        commitLocalAction();
        showToast('🗑️ Elemento excluído (Ctrl+Z para desfazer)');
        return;
      }
    }

    const key = e.key.toLowerCase();
    if (key === 'f') {
      fitToScreen();
      return;
    }
    if (key === 'g' && !e.shiftKey) {
      openGalleryModal();
      return;
    }

    const toolMap = {
      'p': 'pen',
      'h': 'highlighter',
      'a': 'arrow',
      'l': 'line',
      'r': 'rect',
      'm': 'mux',
      'u': 'alu',
      't': 'text',
      'e': 'eraser',
      's': 'select',
      'v': 'select'
    };

    if (toolMap[key]) {
      setActiveTool(toolMap[key]);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spacePressed = false;
      wrapper.classList.remove('pan-mode');
      wrapper.classList.remove('panning');
      if (currentTool === 'eraser') {
        wrapper.classList.add('eraser-mode');
        updateEraserCursorSize();
      }
    }
  });
}

// ==================== WebSocket Collaboration System ====================

function initWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}/ws`;

  try {
    ws = new WebSocket(wsUrl);
  } catch (err) {
    console.warn('Erro ao inicializar WebSocket:', err);
    updateCollabUI(1, false);
    scheduleWsReconnect();
    return;
  }

  ws.onopen = () => {
    wsConnected = true;
    updateCollabUI(1, true);
    // Send user profile on connect
    sendWsMessage({
      type: 'join',
      name: myUserName,
      color: myUserColor
    });
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWsMessage(msg);
    } catch (err) {
      console.error('Erro ao processar mensagem colaborativa:', err);
    }
  };

  ws.onclose = () => {
    wsConnected = false;
    updateCollabUI(1, false);
    peerCursors.clear();
    peerLiveStrokes.clear();
    render();
    scheduleWsReconnect();
  };

  ws.onerror = () => {
    // onclose handles reconnect
  };
}

function scheduleWsReconnect() {
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
  wsReconnectTimer = setTimeout(() => {
    initWebSocket();
  }, 3000);
}

function sendWsMessage(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (e) {
      console.warn('Falha ao enviar mensagem WS:', e);
    }
  }
}

function handleWsMessage(msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'init': {
      wsClientId = msg.clientId;
      undoStack = [];
      redoStack = [];
      pendingUndoState = null;
      updateUndoRedoUI();
      const count = msg.userCount || 1;
      updateCollabUI(count, true);

      // If server already has elements, adopt them!
      if (msg.elements && msg.elements.length > 0) {
        elements = msg.elements;
        rehydrateImages();
        render();
      } else if (!hasSentInitialSync && elements.length > 0) {
        // If server is blank but we have existing elements from localStorage, share with server!
        hasSentInitialSync = true;
        broadcastBoardSync();
      }
      break;
    }

    case 'presence': {
      const count = msg.userCount || 1;
      updateCollabUI(count, true);
      if (msg.user && msg.user.name && msg.user.clientId !== wsClientId) {
        showToast(`👋 ${msg.user.name} entrou no quadro!`);
      }
      if (msg.left) {
        peerCursors.delete(msg.left);
        peerLiveStrokes.delete(msg.left);
        render();
      }
      break;
    }

    case 'cursor': {
      if (msg.clientId === wsClientId) return;
      peerCursors.set(msg.clientId, {
        x: msg.x,
        y: msg.y,
        name: msg.name || 'Amigo',
        color: msg.color || '#2563eb',
        tool: msg.tool || 'pen',
        lastSeen: Date.now()
      });
      render();
      break;
    }

    case 'cursor_remove': {
      peerCursors.delete(msg.clientId);
      peerLiveStrokes.delete(msg.clientId);
      render();
      break;
    }

    case 'stroke_live': {
      if (msg.clientId === wsClientId) return;
      peerLiveStrokes.set(msg.clientId, {
        type: 'path',
        tool: msg.tool || 'pen',
        color: msg.color || '#2563eb',
        size: msg.size || 2,
        points: msg.points || []
      });
      render();
      break;
    }

    case 'board_patch': {
      peerLiveStrokes.delete(msg.clientId);
      receiveBoardChanges(msg.changes || []);
      break;
    }

    case 'element_add': {
      if (msg.clientId === wsClientId) return;
      peerLiveStrokes.delete(msg.clientId);
      if (msg.element) {
        receiveBoardChanges([{ id: msg.element.id, after: msg.element }]);
        if (msg.element.type === 'image') {
          rehydrateImages();
        }
        render();
      }
      break;
    }

    case 'board_sync': {
      if (msg.clientId === wsClientId) return;
      peerLiveStrokes.delete(msg.clientId);
      if (Array.isArray(msg.elements)) {
        receiveBoardChanges(boardChanges(JSON.parse(serializeBoardState()), msg.elements));
        selectedElement = null;
        rehydrateImages();
        render();
      }
      break;
    }

    case 'board_clear': {
      if (msg.clientId === wsClientId) return;
      peerLiveStrokes.clear();
      receiveBoardChanges(boardChanges(JSON.parse(serializeBoardState()), []));
      selectedElement = null;
      render();
      showToast('🧹 O quadro foi limpo por outro participante.');
      break;
    }
  }
}

// Broadcast throttle helpers
function broadcastCursor(x, y) {
  const now = Date.now();
  if (now - lastCursorBroadcastTime > 35) {
    lastCursorBroadcastTime = now;
    sendWsMessage({
      type: 'cursor',
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      name: myUserName,
      color: myUserColor,
      tool: currentTool
    });
  }
}

function broadcastLiveStroke(pathEl) {
  const now = Date.now();
  if (now - lastStrokeBroadcastTime > 45) {
    lastStrokeBroadcastTime = now;
    sendWsMessage({
      type: 'stroke_live',
      tool: pathEl.tool || 'pen',
      color: pathEl.color,
      size: pathEl.size,
      points: pathEl.points
    });
  }
}

function broadcastElementAdd(el) {
  if (commitLocalAction()) return;
  if (!el) return;
  const clean = { ...el };
  delete clean.imgObj;
  sendWsMessage({
    type: 'element_add',
    element: clean
  });
}

function broadcastBoardSync() {
  if (commitLocalAction()) return;
  ensureElementIds();
  const cleanElements = elements.map(el => {
    const copy = { ...el };
    delete copy.imgObj;
    return copy;
  });
  sendWsMessage({
    type: 'board_sync',
    elements: cleanElements
  });
}

function broadcastBoardClear() {
  if (commitLocalAction()) return;
  sendWsMessage({
    type: 'board_clear'
  });
}

// Draw peer cursor on canvas
function drawPeerCursor(context, peer) {
  context.save();
  context.translate(peer.x, peer.y);

  // Scale inversely by zoom so cursor and label size stay constant in screen pixels
  const invZoom = 1 / zoom;
  context.scale(invZoom, invZoom);

  const color = peer.color || '#2563eb';

  // 1. Draw pointer arrow
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(0, 16);
  context.lineTo(4, 12);
  context.lineTo(8, 20);
  context.lineTo(11, 18.5);
  context.lineTo(7, 10.5);
  context.lineTo(12, 10.5);
  context.closePath();
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = '#ffffff';
  context.lineWidth = 1.5;
  context.stroke();

  // 2. Draw name badge
  const name = peer.name || 'Amigo';
  context.font = '600 11px Inter, sans-serif';
  const textWidth = context.measureText(name).width;
  const tagX = 14;
  const tagY = 12;
  const tagW = Math.max(28, textWidth + 12);
  const tagH = 20;

  context.fillStyle = color;
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(tagX, tagY, tagW, tagH, 5);
  } else {
    context.rect(tagX, tagY, tagW, tagH);
  }
  context.fill();
  context.strokeStyle = '#ffffff';
  context.lineWidth = 1;
  context.stroke();

  // 3. Draw text label
  context.fillStyle = '#ffffff';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(name, tagX + 6, tagY + tagH / 2);

  context.restore();
}

function updateCollabUI(count, isConnected) {
  if (collabBadge) {
    collabBadge.textContent = count;
    if (isConnected) {
      collabBadge.className = 'collab-badge connected';
      collabBadge.title = `${count} pessoa${count > 1 ? 's' : ''} na sessão colaborativa`;
    } else {
      collabBadge.className = 'collab-badge offline';
      collabBadge.title = 'Desconectado do servidor colaborativo';
    }
  }

  if (collabStatusText && collabStatusIndicator) {
    if (isConnected) {
      collabStatusIndicator.textContent = '🟢';
      collabStatusText.textContent = `Conectado em tempo real · ${count} participante${count > 1 ? 's' : ''} no quadro`;
    } else {
      collabStatusIndicator.textContent = '🔴';
      collabStatusText.textContent = 'Servidor desconectado (tentando reconectar...)';
    }
  }
}

// Setup Collaboration Modal Events & Info
function setupCollabUI() {
  if (!btnCollaborate || !collabModal) return;

  btnCollaborate.addEventListener('click', openCollabModal);
  if (btnCloseCollab) btnCloseCollab.addEventListener('click', closeCollabModal);

  collabModal.addEventListener('click', (e) => {
    if (e.target === collabModal) closeCollabModal();
  });

  // Profile: username input
  if (collabUsernameInput) {
    collabUsernameInput.value = myUserName;
    collabUsernameInput.addEventListener('input', () => {
      const val = collabUsernameInput.value.trim();
      if (val) {
        myUserName = val;
        localStorage.setItem('whiteboard_username', myUserName);
        sendWsMessage({
          type: 'join',
          name: myUserName,
          color: myUserColor
        });
      }
    });
  }

  // Profile: color picker
  if (collabColorPicker) {
    const dots = collabColorPicker.querySelectorAll('.collab-color-dot');
    dots.forEach(d => {
      if (d.dataset.cursorColor === myUserColor) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }

      d.addEventListener('click', () => {
        dots.forEach(dot => dot.classList.remove('active'));
        d.classList.add('active');
        myUserColor = d.dataset.cursorColor;
        localStorage.setItem('whiteboard_usercolor', myUserColor);
        sendWsMessage({
          type: 'join',
          name: myUserName,
          color: myUserColor
        });
      });
    });
  }

  // Copy Buttons
  if (btnCopyLocalUrl && collabLocalUrl) {
    btnCopyLocalUrl.addEventListener('click', () => {
      navigator.clipboard.writeText(collabLocalUrl.value).then(() => {
        const origText = btnCopyLocalUrl.innerHTML;
        btnCopyLocalUrl.innerHTML = '✅ Copiado!';
        setTimeout(() => { btnCopyLocalUrl.innerHTML = origText; }, 2500);
      }).catch(() => {
        collabLocalUrl.select();
        document.execCommand('copy');
        btnCopyLocalUrl.innerHTML = '✅ Copiado!';
      });
    });
  }

  if (btnCopyTunnelCmd) {
    btnCopyTunnelCmd.addEventListener('click', () => {
      navigator.clipboard.writeText('npx localtunnel --port 8080').then(() => {
        btnCopyTunnelCmd.textContent = 'Copiado!';
        setTimeout(() => { btnCopyTunnelCmd.textContent = 'Copiar'; }, 2500);
      });
    });
  }

  if (btnCopyCloudflareCmd) {
    btnCopyCloudflareCmd.addEventListener('click', () => {
      navigator.clipboard.writeText('.\\cloudflared.exe tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8080').then(() => {
        btnCopyCloudflareCmd.textContent = 'Copiado!';
        setTimeout(() => { btnCopyCloudflareCmd.textContent = 'Copiar'; }, 2500);
      });
    });
  }
}

async function openCollabModal() {
  if (!collabModal) return;
  collabModal.classList.add('open');

  // Fetch local LAN network info from server
  try {
    const res = await fetch('/api/network-info');
    if (res.ok) {
      const info = await res.json();
      if (collabLocalUrl && info.local_url) {
        collabLocalUrl.value = info.local_url;
      }
      if (info.clients_count !== undefined) {
        updateCollabUI(info.clients_count, wsConnected);
      }
    }
  } catch (err) {
    // Fallback to location.host
    if (collabLocalUrl) {
      collabLocalUrl.value = `http://${location.hostname}:${location.port || 8080}`;
    }
  }
}

function closeCollabModal() {
  if (collabModal) collabModal.classList.remove('open');
}

