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
let currentSize = 2;
let isDrawing = false;
let startX = 0;
let startY = 0;

// Data Layers
let elements = []; // { type: 'path'|'line'|'arrow'|'rect'|'mux'|'alu'|'text'|'image', ... }
let undoStack = [];
let redoStack = [];
let currentPath = null;
let selectedElement = null;
let isDraggingElement = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Auto-save debounce timer
let autoSaveTimer = null;

// Static Curated Templates Catalog (Fallback guarantee!)
const STATIC_TEMPLATES = [
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
const optgroupIncomplete = document.getElementById('optgroup-incomplete');
const optgroupComplete = document.getElementById('optgroup-complete');
const optgroupSteps = document.getElementById('optgroup-steps');
const optgroupExercises = document.getElementById('optgroup-exercises');
const btnOpenGallery = document.getElementById('btnOpenGallery');
const galleryModal = document.getElementById('galleryModal');
const btnCloseGallery = document.getElementById('btnCloseGallery');
const galleryGrid = document.getElementById('galleryGrid');
const chkReplaceCanvas = document.getElementById('chkReplaceCanvas');

const btnSaveAI = document.getElementById('btnSaveAI');
const btnExportPNG = document.getElementById('btnExportPNG');
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
const canvasHint = document.getElementById('canvasHint');

// Initialize
window.addEventListener('load', () => {
  resizeCanvas();
  populateDropdown(STATIC_TEMPLATES);
  buildGalleryModal(STATIC_TEMPLATES);
  loadTemplateOptions(); // fetch dynamic from server if available
  loadSavedBoard();
  setupEventListeners();
  setupHotkeys();

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

// Save state for Undo/Redo
function recordState() {
  undoStack.push(JSON.stringify(elements));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  scheduleAutoSave();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(elements));
  const prevState = undoStack.pop();
  elements = JSON.parse(prevState);
  rehydrateImages();
  render();
  scheduleAutoSave();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(elements));
  const nextState = redoStack.pop();
  elements = JSON.parse(nextState);
  rehydrateImages();
  render();
  scheduleAutoSave();
}

function rehydrateImages() {
  elements.forEach(el => {
    if (el.type === 'image' && !el.imgObj) {
      const img = new Image();
      img.onload = () => render();
      img.src = el.src;
      el.imgObj = img;
    }
  });
}

// Render Canvas
function render() {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  // Apply Pan & Zoom
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // Render elements
  elements.forEach(el => drawElement(ctx, el));

  // Render active drawing path/shape preview
  if (isDrawing && currentPath) {
    drawElement(ctx, currentPath);
  }

  // Draw selection outline
  if (selectedElement) {
    drawSelectionBox(ctx, selectedElement);
  }

  ctx.restore();
  updateZoomIndicator();
}

function drawElement(context, el) {
  context.save();

  if (el.type === 'path') {
    if (!el.points || el.points.length < 2) {
      context.restore();
      return;
    }
    context.beginPath();
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

    context.moveTo(el.points[0].x, el.points[0].y);
    for (let i = 1; i < el.points.length; i++) {
      context.lineTo(el.points[i].x, el.points[i].y);
    }
    context.stroke();
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
    context.fillStyle = el.color;
    context.font = `${el.size * 4 + 11}px 'Fira Code', monospace`;
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

function drawSelectionBox(context, el) {
  let bbox = getElementBoundingBox(el);
  if (!bbox) return;

  context.save();
  context.strokeStyle = '#3b82f6';
  context.lineWidth = 1.5;
  context.setLineDash([4, 4]);
  context.strokeRect(bbox.x - 4, bbox.y - 4, bbox.width + 8, bbox.height + 8);
  context.restore();
}

function getElementBoundingBox(el) {
  if (el.type === 'image') {
    return { x: el.x, y: el.y, width: el.width, height: el.height };
  } else if (el.type === 'rect' || el.type === 'mux' || el.type === 'alu') {
    const x = Math.min(el.x1, el.x2);
    const y = Math.min(el.y1, el.y2);
    return { x, y, width: Math.abs(el.x2 - el.x1), height: Math.abs(el.y2 - el.y1) };
  } else if (el.type === 'text') {
    const fontSize = el.size * 4 + 11;
    const estWidth = el.text.length * (fontSize * 0.6);
    return { x: el.x, y: el.y, width: estWidth, height: fontSize * 1.3 };
  }
  return null;
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
}

// ==================== Dropdown & Gallery Builder ====================
function populateDropdown(catalog) {
  optgroupIncomplete.innerHTML = '';
  optgroupComplete.innerHTML = '';
  optgroupSteps.innerHTML = '';
  optgroupExercises.innerHTML = '';

  catalog.forEach(t => {
    const opt = document.createElement('option');
    opt.value = `templates/${t.filename}`;
    opt.textContent = t.title;

    if (t.category.includes('Incompletos')) {
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
      const replace = chkReplaceCanvas.checked;
      loadTemplateToCanvas(`templates/${t.filename}`, replace);
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

function loadTemplateToCanvas(url, replaceCanvas = true) {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    if (replaceCanvas) {
      recordState();
      elements = [];
      selectedElement = null;
    } else {
      recordState();
    }

    // Determine comfortable size for screen
    let maxW = Math.max(500, width * 0.85);
    let maxH = Math.max(400, height * 0.85);
    let w = img.width;
    let h = img.height;

    const scale = Math.min(maxW / w, maxH / h, 1.0);
    w = Math.round(w * scale);
    h = Math.round(h * scale);

    // Center in canvas coordinate space
    const center = screenToCanvas(width / 2, height / 2);
    const posX = center.x - w / 2;
    const posY = center.y - h / 2;

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

    // Reset pan/zoom and fit nicely
    fitToScreen();
    scheduleAutoSave();
    showSyncBadge('Diagrama inserido! Pronto para desenhar.', 'synced');
  };
  img.src = url;
}

window.loadTemplateByName = function(fname) {
  studySidebar.classList.add('closed');
  sidebarBackdrop.classList.remove('active');
  loadTemplateToCanvas(`templates/${fname}`, true);
};

// ==================== Mouse & Touch Event Listeners ====================
function setupEventListeners() {
  // Canvas pointer events
  canvas.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  // Zoom with Wheel
  canvas.addEventListener('wheel', handleWheel, { passive: false });

  // Tool buttons
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
      selectedElement = null;
      render();
    });
  });

  // Color selection
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      currentColor = dot.dataset.color;
    });
  });

  // Size selection
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSize = parseInt(btn.dataset.size, 10);
    });
  });

  // Clear button
  btnClearCanvas.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja limpar todo o quadro?')) {
      recordState();
      elements = [];
      selectedElement = null;
      render();
      saveToAI();
    }
  });

  // File upload input
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
    fileInput.value = '';
  });

  // Save for AI button
  btnSaveAI.addEventListener('click', () => {
    saveToAI(true);
  });

  // Export PNG locally
  btnExportPNG.addEventListener('click', exportLocalPNG);

  // Instant Template Dropdown Selection (Loads immediately on change!)
  templateSelect.addEventListener('change', () => {
    const val = templateSelect.value;
    if (val) {
      loadTemplateToCanvas(val, true);
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

// Pointer event handlers
function handlePointerDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Spacebar pan or middle click or pan tool
  if (spacePressed || e.button === 1 || currentTool === 'pan') {
    isPanning = true;
    startPanX = e.clientX - panX;
    startPanY = e.clientY - panY;
    wrapper.classList.add('panning');
    return;
  }

  const pt = screenToCanvas(mouseX, mouseY);
  startX = pt.x;
  startY = pt.y;

  if (currentTool === 'select') {
    selectedElement = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const bbox = getElementBoundingBox(el);
      if (bbox && pt.x >= bbox.x && pt.x <= bbox.x + bbox.width && pt.y >= bbox.y && pt.y <= bbox.y + bbox.height) {
        selectedElement = el;
        isDraggingElement = true;
        dragOffsetX = pt.x - el.x;
        dragOffsetY = pt.y - el.y;
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
    eraseNear(pt.x, pt.y);
    isDrawing = true;
    return;
  }

  // Draw tools: pen, highlighter, line, arrow, rect, mux, alu
  isDrawing = true;
  recordState();

  if (currentTool === 'pen' || currentTool === 'highlighter') {
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
  if (isPanning) {
    panX = e.clientX - startPanX;
    panY = e.clientY - startPanY;
    render();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const pt = screenToCanvas(mouseX, mouseY);

  if (isDraggingElement && selectedElement) {
    selectedElement.x = pt.x - dragOffsetX;
    selectedElement.y = pt.y - dragOffsetY;
    render();
    return;
  }

  if (!isDrawing) return;

  if (currentTool === 'eraser') {
    eraseNear(pt.x, pt.y);
    return;
  }

  if (currentPath) {
    if (currentPath.type === 'path') {
      currentPath.points.push({ x: pt.x, y: pt.y });
    } else {
      currentPath.x2 = pt.x;
      currentPath.y2 = pt.y;
    }
    render();
  }
}

function handlePointerUp() {
  if (isPanning) {
    isPanning = false;
    wrapper.classList.remove('panning');
  }

  if (isDraggingElement) {
    isDraggingElement = false;
    scheduleAutoSave();
  }

  if (isDrawing) {
    isDrawing = false;
    if (currentPath) {
      elements.push(currentPath);
      currentPath = null;
      render();
      scheduleAutoSave();
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
}

function applyZoom(factor) {
  const centerX = width / 2;
  const centerY = height / 2;
  const newZoom = Math.min(Math.max(0.15, zoom * factor), 5.0);

  panX = centerX - (centerX - panX) * (newZoom / zoom);
  panY = centerY - (centerY - panY) * (newZoom / zoom);
  zoom = newZoom;

  render();
}

function updateZoomIndicator() {
  zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
}

// Eraser
function eraseNear(cx, cy) {
  const radius = currentSize * 8;
  const initialLen = elements.length;
  elements = elements.filter(el => {
    if (el.type === 'path') {
      return !el.points.some(p => Math.hypot(p.x - cx, p.y - cy) < radius);
    } else if (el.type === 'line' || el.type === 'arrow') {
      return Math.hypot((el.x1 + el.x2) / 2 - cx, (el.y1 + el.y2) / 2 - cy) > radius * 2;
    }
    const bbox = getElementBoundingBox(el);
    if (bbox) {
      return !(cx >= bbox.x && cx <= bbox.x + bbox.width && cy >= bbox.y && cy <= bbox.y + bbox.height);
    }
    return true;
  });

  if (elements.length !== initialLen) {
    render();
    scheduleAutoSave();
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
  input.style.fontSize = `${currentSize * 4 + 14}px`;
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

  function commitText() {
    const text = input.value.trim();
    if (text) {
      recordState();
      elements.push({
        type: 'text',
        text: text,
        x: canvasX,
        y: canvasY,
        color: currentColor,
        size: currentSize
      });
      render();
      scheduleAutoSave();
    }
    input.remove();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitText();
    } else if (e.key === 'Escape') {
      input.remove();
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
  reader.onload = (event) => {
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
        type: 'image',
        src: event.target.result,
        x: x,
        y: y,
        width: w,
        height: h,
        imgObj: img
      };
      elements.push(el);
      selectedElement = el;
      render();
      saveToAI();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// AI Synchronization (Export PNG & JSON to server)
function scheduleAutoSave() {
  showSyncBadge('Alterações pendentes...', 'saving');
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveToAI(false);
  }, 3500);
}

async function saveToAI(manual = false) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  showSyncBadge('Sincronizando com a IA...', 'saving');

  try {
    const exportCanvas = document.createElement('canvas');
    const expCtx = exportCanvas.getContext('2d');

    const bounds = getElementsBounds() || { minX: 0, minY: 0, maxX: width, maxY: height, width, height };
    const padding = 50;
    const expW = Math.max(1200, bounds.width + padding * 2);
    const expH = Math.max(800, bounds.height + padding * 2);

    exportCanvas.width = expW;
    exportCanvas.height = expH;

    // Fill clean white background
    expCtx.fillStyle = '#ffffff';
    expCtx.fillRect(0, 0, expW, expH);

    // Subtle grid pattern
    expCtx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    expCtx.lineWidth = 1;
    for (let x = 0; x < expW; x += 30) {
      expCtx.beginPath();
      expCtx.moveTo(x, 0);
      expCtx.lineTo(x, expH);
      expCtx.stroke();
    }
    for (let y = 0; y < expH; y += 30) {
      expCtx.beginPath();
      expCtx.moveTo(0, y);
      expCtx.lineTo(expW, y);
      expCtx.stroke();
    }

    // Translate to align content
    expCtx.translate(-bounds.minX + padding, -bounds.minY + padding);

    // Draw all elements
    elements.forEach(el => drawElement(expCtx, el));

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
        showToast('✅ Quadro salvo e visível para a IA! Pode me chamar no chat.');
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
  try {
    const res = await fetch('/current_board.json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.elements) {
        elements = data.elements;
        rehydrateImages();
        setTimeout(() => {
          fitToScreen();
          showSyncBadge('● Sincronizado com IA', 'synced');
        }, 150);
      }
    }
  } catch (e) {
    // board file doesn't exist yet
  }
}

function exportLocalPNG() {
  const link = document.createElement('a');
  link.download = `whiteboard_mips_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
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
      studySidebar.classList.add('closed');
      sidebarBackdrop.classList.remove('active');
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

    const key = e.key.toLowerCase();
    if (key === 'f') {
      fitToScreen();
      return;
    }
    if (key === 'g') {
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
      's': 'select'
    };

    if (toolMap[key]) {
      currentTool = toolMap[key];
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      const btn = document.querySelector(`.tool-btn[data-tool="${currentTool}"]`);
      if (btn) btn.classList.add('active');
      render();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spacePressed = false;
      wrapper.classList.remove('pan-mode');
      wrapper.classList.remove('panning');
    }
  });
}
