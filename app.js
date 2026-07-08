/* ==========================================================================
   VANGUARD ARENA AI - APPLICATION ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // --- STATE VARIABLES ---
  let currentLanguage = 'en';
  let activeIncidentId = '1';
  let isRecording = false;
  let speechSynth = window.speechSynthesis;
  let recognition = null;
  let activeTab = 'assistant'; // assistant, navigation, sustainability
  let totalEcoPoints = 120;
  
  // Custom generated incident count
  let customIncidentCounter = 3;

  // --- RETRO SOUND SYNTHESIS ENGINE ---
  function playRetroSound(type) {
    if (document.body.classList.contains('accessibility-mode')) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (type === 'beep') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'boop') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(450, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'warn') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.setValueAtTime(750, now + 0.12);
        osc.frequency.setValueAtTime(550, now + 0.24);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.setValueAtTime(500, now + 0.06);
        osc.frequency.setValueAtTime(650, now + 0.12);
        osc.frequency.setValueAtTime(900, now + 0.18);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch (e) {
      console.warn("Web Audio API synthesis failed", e);
    }
  }

  // --- RETRO LIVE EVENT POOL & LOADER ---
  const retroLiveEventsPool = [
    { type: 'match', text: "76' - Foul by Bellingham (England) on Musah near penalty area." },
    { type: 'weather', text: "WEATHER: Wind gusting 15mph NW. Temperature: 68°F. Retractable canopy stays open." },
    { type: 'alert', text: "Gate B ticket scanner lines dropping. Average wait time now: 3 mins." },
    { type: 'transit', text: "TRANSIT: MetLife Rail Shuttle reports trains to Secaucus running on 8 min headways." },
    { type: 'security', text: "SECURITY: Sector 104 volunteers matching crowd diversion directives. Gates clear." },
    { type: 'nav', text: "AI navigation routing recommends Gate B detour for Sectors 103, 104." },
    { type: 'match', text: "79' - Close! Header by Kane (England) hits the crossbar!" },
    { type: 'weather', text: "WEATHER: Light drizzle detected at perimeter sensors. Radar indicates clearing in 10m." },
    { type: 'transit', text: "TRANSIT: Rideshare Lot D queues forming. Estimated wait for pickup is 14 mins." },
    { type: 'security', text: "SECURITY: Elevated crowd volumes at Concourse A concessions. 2 volunteer units dispatched." },
    { type: 'match', text: "82' - Substitution England: #9 Kane OFF, #18 Watkins ON." },
    { type: 'alert', text: "ALERT: Restroom wait times in Sector 104 surge to 15m. Redirecting to Sector 103." },
    { type: 'match', text: "85' - GOAL! USA score! Aaronson slots it in after a counter-attack!" },
    { type: 'weather', text: "WEATHER: Rain stopped. Temperature: 66°F. Humidity: 72%." },
    { type: 'transit', text: "TRANSIT: Express Shuttle buses to NYC Port Authority loading at South Lot. No queues." },
    { type: 'security', text: "SECURITY: Post-match egress routing volunteers deploying to Gates A, B, C, D." },
    { type: 'alert', text: "ALERT: USA leads England 2-1! Sector 105 crowd density rising." },
    { type: 'match', text: "88' - Yellow Card for Aaronson (USA) for excessive celebration." },
    { type: 'transit', text: "TRANSIT: NJ Transit rail ticketing kiosks at Gate B report zero queue line wait." },
    { type: 'alert', text: "Gate A ticket gate operations recovered. Switch port Cellular WAN #2 stable." },
    { type: 'match', text: "90' - Fourth Official indicates 5 minutes of added time." },
    { type: 'match', text: "90+2' - Corner kick for England. Pressure mounting in USA area." },
    { type: 'match', text: "90+5' - FULL TIME! USA defeats England 2-1 in a thrilling Group match!" }
  ];

  let liveEventIndex = 0;
  function appendLiveEvent(type, text) {
    const container = document.getElementById('live-event-feed-container');
    if (!container) return;
    
    // Remove placeholder
    const placeholder = container.querySelector('.feed-placeholder');
    if (placeholder) placeholder.remove();
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const line = document.createElement('div');
    line.className = 'feed-log-line';
    line.innerHTML = `
      <span class="feed-time">${timeStr}</span>
      <span class="feed-tag tag-${type}">${type}</span>
      <span class="feed-text">${text}</span>
    `;
    
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
    
    // Play retro beep based on type
    if (type === 'alert' || type === 'security') {
      playRetroSound('warn');
    } else if (type === 'transit' || type === 'weather') {
      playRetroSound('beep');
    } else {
      playRetroSound('boop');
    }
  }

  // --- GEMINI API INTEGRATION ---
  let GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || "";

  async function queryGemini(systemPrompt, userPrompt) {
    if (!GEMINI_API_KEY) {
      const userKey = prompt("Please enter your Gemini API Key to enable real-time AI mitigations and suggestions (this will be saved in your browser's localStorage for this site):");
      if (userKey && userKey.trim()) {
        GEMINI_API_KEY = userKey.trim();
        localStorage.setItem('GEMINI_API_KEY', GEMINI_API_KEY);
      } else {
        throw new Error("Gemini API Key is required to run GenAI features.");
      }
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      throw new Error("Empty content in Gemini response");
    }
    return replyText;
  }

  // --- MOCK GENAI DATA STORE ---
  const incidentResolutions = {
    '1': {
      title: "Ticket Turnstile Connectivity Drop (Gate A)",
      status: "Analyzing via GenAI network diagnostics...",
      resolution: `<h4>GenAI Security Operations Action Plan</h4>
<ul>
  <li><strong>Immediate Recommendation:</strong> Divert Gate A incoming queues to adjacent Gate B (East) and Gate D (West). Gate B currently has a low wait time of 4m.</li>
  <li><strong>Digital Alert:</strong> Push real-time alert notification to ticket holders in Sectors 101, 107, and 108 advising them of the detour.</li>
  <li><strong>Staff Reallocation:</strong> Auto-matching 4 volunteers closest to Sector 108 (Zone A Concourse) to dispatch as mobile ticket checkers.</li>
  <li><strong>System Recovery:</strong> GenAI network monitor detects a local switch port freeze. Recommended technical step: Re-route traffic to redundant backup cellular network router (Cellular WAN #2).</li>
</ul>`
    },
    '2': {
      title: "Restroom Queue Surge (Sector 104)",
      status: "Running crowd-flow simulations...",
      resolution: `<h4>GenAI Operations Crowd Mitigation Plan</h4>
<ul>
  <li><strong>Restroom Rerouting:</strong> Direct Concourse 104 guests to Concourse 103 restrooms (only 50m away, 1m queue wait time).</li>
  <li><strong>Dynamic Signage:</strong> Automatically update overhead digital monitors at Sector 104 entry to show "Green Status: Bathrooms Open in Sector 103".</li>
  <li><strong>Volunteer Dispatch:</strong> Alert closest volunteers (ID 208, 104) to direct human traffic away from the Sector 104 access ramps.</li>
  <li><strong>Telemetry Update:</strong> Queue sensors calibrated. Re-routing queue load will reduce Sector 104 backlog below 5 minutes in approximately 6 minutes.</li>
</ul>`
    }
  };

  const dynamicEcoTips = [
    "By choosing the rail network from Manhattan/Secaucus Junction, you minimized parking logistics and queue emissions. Remember, MetLife Stadium offers free water refills in Concourse A & C when you bring a reusable stadium-approved clear bottle!",
    "Stadium recycling challenge: MetLife Stadium features compostable packaging at 80% of our concessions. Place cups in the Green Bins to earn double 'Green Play' points when validated by volunteer scanners!",
    "Going carpool: Sharing rides with 3+ friends reduced your travel carbon footprint by 64%. Scan the carpool registration code at the Gate B parking terminal to log your group points!",
    "Solar canopy energy: Gate B's solar awning has generated over 420 kWh of electricity today, fully powering the stadium's fan concierge terminals and wayfinding displays!"
  ];

  // Multilingual responses for Fan Chat Assistant
  const chatbotLocales = {
    en: {
      welcome: "Welcome to MetLife Stadium for the FIFA World Cup 2026! I am your GenAI Tournament Assistant. How can I help you find your seat, check gate delays, or track accessibility routes today?",
      typing: "GenAI is thinking...",
      voiceStart: "Listening... Speak now.",
      voiceError: "Voice input not detected. Try typing instead.",
      directionsTitle: "AI Route Directions Generated",
      stepGate: "Enter via Gate B (East). Head past the FIFA Fan Zone ticketing desks.",
      stepConcourse: "Take the main elevator to Concourse Level 1.",
      stepTurn: "Turn left at Concourse B concession counter.",
      stepRamp: "Enter Sector 104 seating bowl through Portal 104.",
      stepWheelchair: "Take Accessible Ramp 3 on the right directly to Seat Wheelchair Platform Row 12.",
      stepSeat: "Your seat is Row 12, Seat 4.",
      ecoSuccess: "Logged transit successfully! Points added to account."
    },
    es: {
      welcome: "¡Bienvenido al MetLife Stadium para la Copa Mundial de la FIFA 2026! Soy tu Asistente GenAI del Torneo. ¿Cómo puedo ayudarte hoy a encontrar tu asiento, revisar retrasos en las puertas o seguir rutas de accesibilidad?",
      typing: "GenAI está pensando...",
      voiceStart: "Escuchando... Habla ahora.",
      voiceError: "No se detectó entrada de voz. Intenta escribir.",
      directionsTitle: "Direcciones de Ruta Generadas por IA",
      stepGate: "Entra por la Puerta B (Este). Pasa los mostradores de venta de entradas de la Fan Zone.",
      stepConcourse: "Toma el ascensor principal hasta el Nivel de Concourse 1.",
      stepTurn: "Gira a la izquierda en el mostrador de comida Concourse B.",
      stepRamp: "Ingresa a la zona de asientos del Sector 104 por el Portal 104.",
      stepWheelchair: "Toma la Rampa de Accesibilidad 3 a la derecha directamente a la plataforma de silla de ruedas de la Fila 12.",
      stepSeat: "Tu asiento es la Fila 12, Asiento 4.",
      ecoSuccess: "¡Tránsito registrado con éxito! Puntos añadidos a tu cuenta."
    },
    pt: {
      welcome: "Bem-vindo ao MetLife Stadium para a Copa do Mundo da FIFA 2026! Sou o seu Assistente GenAI do Torneio. Como posso ajudar você a encontrar seu assento, verificar atrasos nos portões ou acompanhar rotas de acessibilidade hoje?",
      typing: "GenAI está pensando...",
      voiceStart: "Ouvindo... Fale agora.",
      voiceError: "Entrada de voz não detectada. Tente digitar.",
      directionsTitle: "Direções de Rota Geradas por IA",
      stepGate: "Entre pelo Portão B (Leste). Siga pelos balcões de ingressos da Fan Zone.",
      stepConcourse: "Pegue o elevador principal para o Nível Concourse 1.",
      stepTurn: "Vire à esquerda no balcão de alimentação do Concourse B.",
      stepRamp: "Entre no setor de assentos do Setor 104 pelo Portal 104.",
      stepWheelchair: "Pegue a Rampa de Acessibilidade 3 à direita diretamente para a plataforma de cadeiras de rodas da Fileira 12.",
      stepSeat: "Seu assento é Fileira 12, Assento 4.",
      ecoSuccess: "Trânsito registrado com sucesso! Pontos adicionados."
    },
    de: {
      welcome: "Willkommen im MetLife Stadium für die FIFA Fussball-Weltmeisterschaft 2026! Ich bin Ihr GenAI Turnier-Assistent. Wie kann ich Ihnen heute helfen, Ihren Sitzplatz zu finden, Verzögerungen an den Toren zu prüfen oder barrierefreie Routen zu finden?",
      typing: "GenAI denkt nach...",
      voiceStart: "Zuhören... Sprechen Sie jetzt.",
      voiceError: "Spracheingabe nicht erkannt. Bitte tippen Sie stattdessen.",
      directionsTitle: "KI-Routennavigation Generiert",
      stepGate: "Gehen Sie durch Tor B (Ost) hinein. Vorbei an den FIFA Fan-Zone Ticketschaltern.",
      stepConcourse: "Nehmen Sie den Hauptaufzug zum Concourse Level 1.",
      stepTurn: "Biegen Sie am Concourse B Food-Counter links ab.",
      stepRamp: "Betreten Sie den Sitzbereich Sektor 104 über Portal 104.",
      stepWheelchair: "Nehmen Sie die barrierefreie Rampe 3 rechts direkt zur Rollstuhlplattform Reihe 12.",
      stepSeat: "Ihr Sitzplatz ist Reihe 12, Platz 4.",
      ecoSuccess: "Transit erfolgreich protokolliert! Punkte gutgeschrieben."
    },
    fr: {
      welcome: "Bienvenue au MetLife Stadium pour la Coupe du Monde de la FIFA 2026 ! Je suis votre assistant GenAI du tournoi. Comment puis-je vous aider à trouver votre siège, vérifier les retards aux portes ou localiser les itinéraires accessibles aujourd'hui ?",
      typing: "GenAI réfléchit...",
      voiceStart: "Écoute en cours... Parlez maintenant.",
      voiceError: "Entrée vocale non détectée. Veuillez saisir votre texte.",
      directionsTitle: "Itinéraire Généré par l'IA",
      stepGate: "Entrez par la Porte B (Est). Passez les guichets de la FIFA Fan Zone.",
      stepConcourse: "Prenez l'ascenseur principal jusqu'au niveau 1.",
      stepTurn: "Tournez à gauche au stand de restauration du Concourse B.",
      stepRamp: "Entrez dans la tribune du Secteur 104 par le Portail 104.",
      stepWheelchair: "Prenez la rampe d'accès 3 sur la droite menant directement à la plateforme PMR, rangée 12.",
      stepSeat: "Votre siège est rangée 12, place 4.",
      ecoSuccess: "Transit enregistré avec succès ! Points ajoutés."
    },
    ar: {
      welcome: "مرحباً بكم في استاد ميتلايف لحضور كأس العالم فيفا 2026! أنا مساعدك الذكي الخاص بالبطولة. كيف يمكنني مساعدتك في العثور على مقعدك، التحقق من طوابير البوابات، أو تحديد مسارات ذوي الاحتياجات الخاصة اليوم؟",
      typing: "الذكاء الاصطناعي يفكر...",
      voiceStart: "جاري الاستماع... تحدث الآن.",
      voiceError: "لم يتم اكتشاف صوت. حاول الكتابة بدلاً من ذلك.",
      directionsTitle: "تم توليد اتجاهات المسار بواسطة الذكاء الاصطناعي",
      stepGate: "ادخل عبر البوابة B (الشرقية). اعبر مكاتب بيع تذاكر منطقة المشجعين.",
      stepConcourse: "خذ المصعد الرئيسي إلى المستوى الأول.",
      stepTurn: "انعطف يساراً عند كشك الطعام في الممر B.",
      stepRamp: "ادخل إلى قطاع المقاعد 104 عبر البوابة 104.",
      stepWheelchair: "خذ المنحدر المخصص لذوي الاحتياجات الخاصة رقم 3 على اليمين مباشرة إلى منصة الكراسي المتحركة الصف 12.",
      stepSeat: "مقعدك هو الصف 12، المقعد 4.",
      ecoSuccess: "تم تسجيل وسيلة النقل بنجاح! تم إضافة النقاط."
    },
    ja: {
      welcome: "FIFAワールドカップ2026 メットライフ・スタジアムへようこそ！私はAI大会コンシェルジュです。座席の案内、ゲートの混雑状況、バリアフリールートの検索など、何でもお手伝いいたします。",
      typing: "AIが思考中...",
      voiceStart: "音声認識中... 話してください。",
      voiceError: "音声が検出されませんでした。テキスト入力をお試しください。",
      directionsTitle: "AIによるルート案内が生成されました",
      stepGate: "ゲートB（東口）から入場し、ファンゾーンチケット売り場を通過します。",
      stepConcourse: "中央エレベーターでコンコース・レベル1に上がります。",
      stepTurn: "コンコースBの売店で左に曲がります。",
      stepRamp: "ポータル104からセクター104の座席エリアに入ります。",
      stepWheelchair: "右側のバリアフリー・スロープ3を進み、列12の車椅子エリアに直行します。",
      stepSeat: "座席は列12、4番席です。",
      ecoSuccess: "交通機関의 기록 완료！에코 포인트가 적립되었습니다."
    },
    it: {
      welcome: "Benvenuto al MetLife Stadium per la Coppa del Mondo FIFA 2026! Sono il tuo Assistente GenAI del Torneo. Come posso aiutarti oggi a trovare il tuo posto, controllare i ritardi ai cancelli o monitorare i percorsi di accessibilità?",
      typing: "GenAI sta pensando...",
      voiceStart: "Ascolto in corso... Parla ora.",
      voiceError: "Ingresso vocale non rilevato. Prova a scrivere.",
      directionsTitle: "Indicazioni stradali generate dall'IA",
      stepGate: "Entra dal cancello B (Est). Passa oltre i botteghini della FIFA Fan Zone.",
      stepConcourse: "Prendi l'ascensore principale per il livello Concourse 1.",
      stepTurn: "Svolta a sinistra al bancone ristoro del Concourse B.",
      stepRamp: "Accedi al settore 104 tramite il Portale 104.",
      stepWheelchair: "Prendi la rampa di accessibilità 3 a destra direttamente per la pedana per sedie a rotelle Fila 12.",
      stepSeat: "Il tuo posto è Fila 12, Posto 4.",
      ecoSuccess: "Transito registrato con successo! Punti aggiunti."
    },
    zh: {
      welcome: "欢迎来到大都会人寿体育场参加2026年FIFA世界杯！我是您的GenAI赛事助手。今天我该如何帮您寻找座位、检查登机口延迟或跟踪无障碍通道？",
      typing: "GenAI 正在思考...",
      voiceStart: "正在聆听... 请讲话。",
      voiceError: "未检测到语音输入。请尝试输入文字。",
      directionsTitle: "AI 生成的路线导向",
      stepGate: "通过 B 号门（东口）进入。经过 FIFA 粉丝区售票处。",
      stepConcourse: "乘坐主电梯前往大厅 1 层。",
      stepTurn: "在 Concourse B 餐饮柜台处向左转。",
      stepRamp: "从 104 号门进入 104 区观众席。",
      stepWheelchair: "走右侧的 3 号无障碍坡道，直接前往第 12 排轮椅专用平台。",
      stepSeat: "您的座位是第 12 排，4 号座。",
      ecoSuccess: "交通方式记录成功！积分已存入账户。"
    },
    hi: {
      welcome: "फीफा विश्व कप 2026 के लिए मेटलाइफ स्टेडियम में आपका स्वागत है! मैं आपका जेनएआई टूर्नामेंट सहायक हूं। आज मैं आपकी सीट खोजने, गेट की देरी की जांच करने, या सुगमता मार्गों को ट्रैक करने में आपकी कैसे मदद कर सकता हूं?",
      typing: "जेनएआई सोच रहा है...",
      voiceStart: "सुन रहा हूँ... अब बोलें।",
      voiceError: "आवाज इनपुट नहीं मिला। इसके बजाय टाइप करने का प्रयास करें।",
      directionsTitle: "एआई मार्ग निर्देश जेनरेट किया गया",
      stepGate: "गेट बी (पूर्व) से प्रवेश करें। फीफा फैन ज़ोन टिकट काउंटरों से आगे बढ़ें।",
      stepConcourse: "कॉनकोर्स स्तर 1 पर जाने के लिए मुख्य लिफ्ट लें।",
      stepTurn: "कॉनकोर्स बी रियायत काउंटर पर बाएं मुड़ें।",
      stepRamp: "पोर्टल 104 के माध्यम से सेक्टर 104 सीटिंग बाउल में प्रवेश करें।",
      stepWheelchair: "सीधे रो 12 व्हीलचेयर प्लेटफॉर्म पर जाने के लिए दाईं ओर सुगम रैंप 3 लें।",
      stepSeat: "आपकी सीट रो 12, सीट 4 है।",
      ecoSuccess: "यात्रा सफलतापूर्वक लॉग की गई! अंक जोड़ दिए गए।"
    },
    ko: {
      welcome: "2026 FIFA 월드컵 메트라이프 스타디움에 오신 것을 환영합니다! 저는 귀하의 GenAI 토너먼트 어시스턴트입니다. 오늘 좌석 찾기, 게이트 대기 시간 확인, 배리어 프리 경로 확인 등 어떤 도움이 필요하십니까?",
      typing: "GenAI가 생각하고 있습니다...",
      voiceStart: "듣고 있습니다... 말씀하세요.",
      voiceError: "음성이 인식되지 않았습니다. 타이핑을 시도해 주세요.",
      directionsTitle: "AI 생성 경로 안내",
      stepGate: "게이트 B(동쪽)로 입장하십시오. FIFA 팬 존 티켓 부스를 지나세요.",
      stepConcourse: "중앙 엘리베이터를 타고 콘코스 레벨 1로 올라가세요.",
      stepTurn: "콘코스 B 매점 코너에서 좌회전하세요.",
      stepRamp: "포털 104를 통해 섹터 104 좌석 구역으로 들어가세요.",
      stepWheelchair: "우측 배리어 프리 슬로프 3을 타고 12열 휠체어 전용 플랫폼으로 이동하세요.",
      stepSeat: "귀하의 좌석은 12열 4번 좌석입니다.",
      ecoSuccess: "이동 기록 완료! 에코 포인트가 적립되었습니다."
    }
  };

  // Complex Keyword Mapping for AI Assistant Queries
  const searchKeywords = {
    gate: {
      en: "Based on current stadium telemetry, **Gate B (East)** offers the shortest queue time of **4 minutes**. Gate A (North) is heavily congested with a **22 minute wait** due to offline scanners. We recommend rerouting via Gate B if possible.",
      es: "Según la telemetría del estadio, la **Puerta B (Este)** ofrece el tiempo de espera más corto de **4 minutos**. La Puerta A (Norte) está congestionada con **22 minutos de espera** debido a escáneres fuera de línea.",
      pt: "De acordo com os sensores, o **Portão B (Leste)** oferece o menor tempo de espera (**4 minutos**). O Portão A (Norte) está congestionado com **22 minutos**.",
      de: "Gemäß der Stadionmessung hat **Tor B (Ost)** die kürzeste Wartezeit von **4 Minuten**. Tor A (Nord) ist stark überlastet (Wartezeit **22 Minuten**).",
      fr: "Selon la télémétrie, la **Porte B (Est)** présente l'attente la plus courte : **4 minutes**. La Porte A (Nord) est très encombrée (attente de **22 minutes**).",
      ar: "بناءً على قياسات الاستاد، توفر **البوابة B (الشرقية)** أقصر وقت انتظار يبلغ **4 دقائق**. تعاني البوابة A من ازدحام شديد (انتظار **22 دقيقة**).",
      ja: "スタジアムのデータによると、現在**ゲートB（東口）**が最も空いており、待ち時間は**4分**です。ゲートA（北口）はスキャナー不具合により**22分待ち**の混雑となっています。"
    },
    sector: {
      en: "Sector 104 is located in the South-East section. If you entered from Gate B, walk straight past Concourse B concessions, then enter Portal 104. Ramps are located on the right side of the portal.",
      es: "El Sector 104 está situado en la sección sureste. Si entraste por la Puerta B, camina recto pasando los puestos del Concourse B, luego entra por el Portal 104.",
      pt: "O Setor 104 fica na seção sudeste. Se você entrou pelo Portão B, caminhe em frente após as lanchonetes do Concourse B e entre pelo Portal 104.",
      de: "Sektor 104 befindet sich im südöstlichen Bereich. Wenn Sie durch Tor B eintreten, gehen Sie geradeaus an den Concourse B concessions vorbei und nutzen Sie Portal 104.",
      fr: "Le Secteur 104 est situé dans la partie Sud-Est. Si vous entrez par la Porte B, marchez tout droit après les concessions du Concourse B, puis entrez par le Portail 104.",
      ar: "يقع القطاع 104 في الجانب الجنوبي الشرقي. إذا دخلت من البوابة B، سر بشكل مستقيم متجاوزاً مطاعم الممر B، ثم ادخل عبر المدخل 104.",
      ja: "セクター104は南東エリアに位置しています。ゲートBからご入場の場合、コンコースBの売店を通り過ぎて直進し、ポータル104からお入りください。"
    },
    accessibility: {
      en: "♿ MetLife Stadium features step-free routes for all seating sectors. Accessible elevators are located near Gates B, C, and D. Portal 104 has wheelchair platform seating at Row 12, accessible via Ramp 3 on the right.",
      es: "♿ El MetLife Stadium cuenta con rutas sin escalones para todos los sectores. Los ascensores accesibles están cerca de las Puertas B, C y D. El Portal 104 tiene asientos de plataforma en la Fila 12.",
      pt: "♿ O MetLife Stadium possui rotas acessíveis sem degraus. Os elevadores adaptados estão localizados perto dos Portões B, C e D. O Portal 104 possui plataforma para cadeirantes na Fileira 12.",
      de: "♿ Das MetLife Stadium bietet stufenfreie Wege für alle Sektoren. Barrierefreie Aufzüge befinden sich in der Nähe der Tore B, C und D. Portal 104 verfügt über Rollstuhlplätze in Reihe 12.",
      fr: "♿ Le MetLife Stadium propose des itinéraires sans marches pour tous les secteurs. Des ascenseurs adaptés sont situés près des Portes B, C et D. Le Portail 104 dispose de sièges PMR à la rangée 12.",
      ar: "♿ يوفر استاد ميتلايف مسارات خالية من الدرج لجميع القطاعات. تقع المصاعد المخصصة لذوي الاحتياجات الخاصة بالقرب من البوابات B و C و D. يحتوي المدخل 104 على مقاعد مهيأة في الصف 12.",
      ja: "♿ スタジアム内はすべてのセクターで段差なしの移動が可能です。エレベーターはゲートB、C、D付近にあります。ポータル104の車椅子エリアは列12にあり、右側のスロープ3からアクセスできます。"
    },
    transit: {
      en: "Commuter trains connect MetLife Stadium to NYC Secaucus Junction. Trains run every 10 minutes post-match. Bus shuttles leave from the South Lot. Transit queues are currently moderate.",
      es: "Los trenes conectan el estadio con NYC Secaucus Junction. Hay trenes cada 10 minutos después del partido. Los autobuses lanzadera salen del estacionamiento sur.",
      pt: "Os trenes conectam o estádio à NYC Secaucus Junction. Circulam a cada 10 minutos após o jogo. Os ônibus circulares partem do estacionamento Sul.",
      de: "Züge verbinden das Stadion mit der NYC Secaucus Junction. Nach dem Spiel fahren die Züge alle 10 Minuten. Shuttlebusse fahren vom Parkplatz Süd ab.",
      fr: "Des trains relient le stade à la gare de NYC Secaucus Junction toutes les 10 minutes après le match. Des navettes de bus partent du parking Sud.",
      ar: "تربط القطارات الاستاد بمحطة سيكاوكوس في نيويورك. تعمل القطارات كل 10 دقائق بعد المباراة. تغادر حافلات النقل من المواقف الجنوبية.",
      ja: "スタジアム発ニューヨーク（セコーカスジャンクション）行きの直行列車が運行しています。試合後は10分間隔で運行されます。シャトルバスは南駐車場から発車します。"
    }
  };

  // --- HTML DOM ELEMENT SELECTORS ---
  const btnStaffView = document.getElementById('btn-staff-view');
  const btnFanView = document.getElementById('btn-fan-view');
  const staffViewPanel = document.getElementById('staff-view-panel');
  const fanViewPanel = document.getElementById('fan-view-panel');
  
  const mapBtnHeatmap = document.getElementById('map-btn-heatmap');
  const mapBtnAccessibility = document.getElementById('map-btn-accessibility');
  const mapBtnFacilities = document.getElementById('map-btn-facilities');
  const stadiumMap = document.getElementById('stadium-map');

  const mapTooltip = document.getElementById('map-tooltip');
  const tooltipCapacity = document.getElementById('tooltip-capacity');
  const tooltipWait = document.getElementById('tooltip-wait');

  const incidentContainer = document.getElementById('incident-container');
  const btnTriggerIncident = document.getElementById('btn-trigger-incident');
  const consoleLog = document.getElementById('console-log');
  const consoleStatusText = document.getElementById('console-status-text');
  const consoleFooter = document.getElementById('console-footer');
  const btnSpeakMitigation = document.getElementById('btn-speak-mitigation');
  const btnDispatchAction = document.getElementById('btn-dispatch-action');

  const tabBtnAssistant = document.getElementById('tab-btn-assistant');
  const tabBtnNavigation = document.getElementById('tab-btn-navigation');
  const tabBtnSustainability = document.getElementById('tab-btn-sustainability');
  const tabBtnPredictions = document.getElementById('tab-btn-predictions');
  const fanTabAssistant = document.getElementById('fan-tab-assistant');
  const fanTabNavigation = document.getElementById('fan-tab-navigation');
  const fanTabSustainability = document.getElementById('fan-tab-sustainability');
  const fanTabPredictions = document.getElementById('fan-tab-predictions');
  const btnRunPredictions = document.getElementById('btn-run-predictions');
  const predictionsLoader = document.getElementById('predictions-loader');
  const predictionsProgressFill = document.getElementById('prediction-progress-fill');
  const predictionsOutputContainer = document.getElementById('predictions-output-container');
  const predictionsAiContent = document.getElementById('predictions-ai-content');
  const predictionsStatusText = document.getElementById('predictions-status-text');

  const chatMessagesLog = document.getElementById('chat-messages-log');
  const chatInput = document.getElementById('chat-input');
  const btnChatSend = document.getElementById('btn-chat-send');
  const btnChatMic = document.getElementById('btn-chat-mic');
  const langButtons = document.querySelectorAll('.lang-btn');
  const quickChips = document.getElementById('quick-chips');

  const selectTransitMode = document.getElementById('select-transit-mode');
  const btnCalculateEco = document.getElementById('btn-calculate-eco');
  const ecoTipBox = document.getElementById('eco-tip-box');
  const btnNewEcoTip = document.getElementById('btn-new-eco-tip');
  const greenScoreStat = document.getElementById('green-score-stat');

  const inputGate = document.getElementById('input-gate');
  const inputSector = document.getElementById('input-sector');
  const inputRoutePref = document.getElementById('input-route-pref');
  const checkboxWheelchair = document.getElementById('checkbox-wheelchair');
  const btnCalculateRoute = document.getElementById('btn-calculate-route');
  const directionsOutputBox = document.getElementById('directions-output-box');
  const directionsStepsList = document.getElementById('directions-steps-list');

  const btnAccessibilityMode = document.getElementById('btn-accessibility-mode');

  // --- INITIALIZATION ---
  stadiumMap.classList.add('stadium-map-heatmap');

  // Start the live event ticker interval
  setInterval(() => {
    if (liveEventIndex < retroLiveEventsPool.length) {
      const ev = retroLiveEventsPool[liveEventIndex];
      appendLiveEvent(ev.type, ev.text);
      liveEventIndex++;
    } else {
      const randEv = retroLiveEventsPool[Math.floor(Math.random() * retroLiveEventsPool.length)];
      appendLiveEvent(randEv.type, randEv.text + " (Repeated telemetry loop)");
    }
  }, 18000);

  function clearRoutePath() {
    const routePath = document.getElementById('active-routing-path');
    const routePathGlow = document.getElementById('active-routing-path-glow');
    if (routePath) routePath.style.display = 'none';
    if (routePathGlow) routePathGlow.style.display = 'none';
  }

  // --- VIEW SELECTOR TOGGLES ---
  btnStaffView.addEventListener('click', () => {
    playRetroSound('beep');
    btnStaffView.classList.add('active');
    btnFanView.classList.remove('active');
    staffViewPanel.classList.remove('hidden-panel');
    fanViewPanel.classList.add('hidden-panel');
  });

  btnFanView.addEventListener('click', () => {
    playRetroSound('beep');
    btnFanView.classList.add('active');
    btnStaffView.classList.remove('active');
    fanViewPanel.classList.remove('hidden-panel');
    staffViewPanel.classList.add('hidden-panel');
  });

  // --- MAP CONTROLS OVERLAYS ---
  mapBtnHeatmap.addEventListener('click', () => {
    playRetroSound('beep');
    clearRoutePath();
    setMapClass('stadium-map-heatmap');
    setActiveMapBtn(mapBtnHeatmap);
  });

  mapBtnAccessibility.addEventListener('click', () => {
    playRetroSound('beep');
    clearRoutePath();
    setMapClass('stadium-map-accessibility');
    setActiveMapBtn(mapBtnAccessibility);
  });

  mapBtnFacilities.addEventListener('click', () => {
    playRetroSound('beep');
    clearRoutePath();
    setMapClass('stadium-map-facilities');
    setActiveMapBtn(mapBtnFacilities);
  });

  function setMapClass(className) {
    stadiumMap.className.baseVal = 'stadium-svg ' + className;
  }

  function setActiveMapBtn(activeBtn) {
    [mapBtnHeatmap, mapBtnAccessibility, mapBtnFacilities].forEach(btn => {
      btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
  }

  // --- INTERACTIVE MAP TOOLTIP HOVER ACTIONS ---
  const sectors = document.querySelectorAll('.stadium-sector');
  sectors.forEach(sector => {
    sector.addEventListener('mousemove', (e) => {
      const name = sector.getAttribute('data-name');
      const capacity = sector.getAttribute('data-capacity');
      const wait = sector.getAttribute('data-wait');
      
      mapTooltip.querySelector('.tooltip-title').textContent = name;
      tooltipCapacity.textContent = capacity;
      tooltipWait.textContent = wait;
      
      const bounds = stadiumMap.getBoundingClientRect();
      const x = e.clientX - bounds.left + 15;
      const y = e.clientY - bounds.top + 15;
      
      mapTooltip.style.left = `${x}px`;
      mapTooltip.style.top = `${y}px`;
      mapTooltip.classList.add('active');
    });

    sector.addEventListener('mouseleave', () => {
      mapTooltip.classList.remove('active');
    });

    sector.addEventListener('click', () => {
      playRetroSound('beep');
      // If clicking sector in Fan mode, auto populate Seat Routing
      const sectorId = sector.id.replace('sector-', '');
      inputSector.value = sectorId;
      // Alert/speak coordinates
      speakAI(`Selected Sector ${sectorId} on map.`);
    });
  });

  // Hover support for Gates and Facilities
  const nodes = document.querySelectorAll('.map-gate-node, .facility-node');
  nodes.forEach(node => {
    node.addEventListener('mousemove', (e) => {
      const name = node.getAttribute('data-name');
      const wait = node.getAttribute('data-wait') || node.getAttribute('data-status');
      
      mapTooltip.querySelector('.tooltip-title').textContent = name;
      tooltipCapacity.previousElementSibling.textContent = "Status:";
      tooltipCapacity.textContent = wait;
      tooltipWait.parentElement.style.display = "none";
      
      const bounds = stadiumMap.getBoundingClientRect();
      const x = e.clientX - bounds.left + 15;
      const y = e.clientY - bounds.top + 15;
      
      mapTooltip.style.left = `${x}px`;
      mapTooltip.style.top = `${y}px`;
      mapTooltip.classList.add('active');
    });

    node.addEventListener('mouseleave', () => {
      mapTooltip.classList.remove('active');
      tooltipCapacity.previousElementSibling.textContent = "Capacity:";
      tooltipWait.parentElement.style.display = "flex";
    });
  });

  // --- STAFF INCIDENT & AI DISPATCH SYSTEM ---
  // Event delegation for Run AI Mitigate buttons
  incidentContainer.addEventListener('click', (e) => {
    const solveBtn = e.target.closest('.btn-incident-solve');
    if (!solveBtn) return;
    
    playRetroSound('beep');
    // De-activate current solving indicator
    document.querySelectorAll('.btn-incident-solve').forEach(btn => btn.classList.remove('active-solve'));
    document.querySelectorAll('.incident-row').forEach(row => row.classList.remove('active-row'));

    solveBtn.classList.add('active-solve');
    const row = solveBtn.closest('.incident-row');
    row.classList.add('active-row');

    activeIncidentId = solveBtn.getAttribute('data-incident-id');
    runIncidentMitigation(activeIncidentId);
  });

  async function runIncidentMitigation(id) {
    consoleStatusText.textContent = "GenAI computing...";
    consoleLog.innerHTML = `<div class="console-placeholder-msg"><span class="ticker-live-dot"></span> Generating operational response vector via Gemini 1.5 Flash...</div>`;
    consoleFooter.style.display = 'none';

    // Get current incident row details
    const activeRow = document.querySelector(`.incident-row.active-row`);
    const title = activeRow ? activeRow.querySelector('.incident-title').textContent : "Stadium Incident";
    const desc = activeRow ? activeRow.querySelector('.incident-desc').textContent : "Unspecified operational anomaly";
    const locNode = activeRow ? activeRow.querySelector('.incident-loc') : null;
    const location = locNode ? locNode.textContent.trim() : "Stadium";

    const systemPrompt = `You are Vanguard Arena AI, an operational decision support system for stadium management during the FIFA World Cup 2026 at MetLife Stadium.
    Generate a highly tactical and concise mitigation action plan for stadium coordinators.
    The output MUST be raw HTML containing ONLY <h4> heading starting with "GenAI Operations Recommendation" and a <ul> list containing several <li> items.
    Do NOT wrap the output in markdown blocks like \`\`\`html.
    Use <strong> tag to highlight key personnel or actions. 
    Ensure you provide:
    1. Immediate containment step (queue diverting, hardware re-routing).
    2. Digital broadcast alerts/updates for affected seating sectors.
    3. Mobilization and dispatch matching for closest volunteer IDs.
    4. Hardware recovery or safety inspection step.`;

    const userPrompt = `An incident occurred: "${title}" at "${location}". Details: "${desc}".`;

    try {
      const responseHtml = await queryGemini(systemPrompt, userPrompt);
      consoleStatusText.textContent = "Resolution generated (100% confidence)";
      consoleLog.innerHTML = responseHtml;
      consoleFooter.style.display = 'flex';
      playRetroSound('success');
    } catch (err) {
      console.warn("Gemini API call failed for mitigation. Using high-fidelity local response.", err);
      // Fallback to static resolution
      const data = incidentResolutions[id];
      if (data) {
        consoleStatusText.textContent = "Resolution generated (Local Fallback)";
        consoleLog.innerHTML = data.resolution;
      } else {
        consoleStatusText.textContent = "Simulation completed";
        consoleLog.innerHTML = `<h4>Custom GenAI Response (Fallback)</h4><p>Containment procedures logged. Redirection notices pushed to active fan tickets in near sectors.</p>`;
      }
      consoleFooter.style.display = 'flex';
      playRetroSound('success');
    }

    // Auto highlight related map segments
    if (id === '1') {
      setMapClass('stadium-map-heatmap');
      setActiveMapBtn(mapBtnHeatmap);
      document.getElementById('sector-104').style.opacity = '0.9';
    } else if (id === '2') {
      setMapClass('stadium-map-facilities');
      setActiveMapBtn(mapBtnFacilities);
    }
    lucide.createIcons();
  }

  // Speak Mitigation (TTS)
  btnSpeakMitigation.addEventListener('click', () => {
    playRetroSound('beep');
    const content = consoleLog.innerText;
    speakAI(content);
  });

  btnDispatchAction.addEventListener('click', () => {
    playRetroSound('success');
    alert("GenAI dispatch alert broadcasted successfully to all venue volunteers and security panels via local mesh network.");
  });

  // Dynamic simulated incident generator
  btnTriggerIncident.addEventListener('click', () => {
    const items = [
      {
        title: "Accessibility Elevator Lift A Outage",
        desc: "Power drop in elevator A. 4 wheelchair-bound fans waiting at concourse lower access hub.",
        prio: "high",
        badge: "CRITICAL",
        loc: "Elevator Lift A",
        sol: `<h4>GenAI Accessibility Action Plan</h4>
<ul>
  <li><strong>Mitigation Strategy:</strong> Deploy nearest Volunteer Escalation unit to guide wheelchair fans to Express Ramp C.</li>
  <li><strong>Digital Assist:</strong> Push direct video stream of wheelchair routes on the mobile companion apps of affected ticket holders.</li>
  <li><strong>Dispatch Action:</strong> Sent dispatch task to Escalation Unit 2 (120m away).</li>
</ul>`
      },
      {
        title: "Gate D Concessions Supply Shortage",
        desc: "Hot dog buns depleted at Concourse D stand. Long lines requesting substitutions.",
        prio: "medium",
        badge: "MEDIUM",
        loc: "Gate D Food Stand",
        sol: `<h4>GenAI Inventory Dispatch Recommendation</h4>
<ul>
  <li><strong>Supply Allocation:</strong> Re-allocate 80 units of backing inventory from Sector 101 excess supply storage to Concourse D.</li>
  <li><strong>AI Recommendation:</strong> Suggest dynamic combo deal on screen (substituting standard bun with gluten-free options or nachos) at 10% discount.</li>
</ul>`
      }
    ];

    const pick = items[Math.floor(Math.random() * items.length)];
    const id = customIncidentCounter.toString();
    customIncidentCounter++;

    incidentResolutions[id] = {
      title: pick.title,
      status: "Calculated response",
      resolution: pick.sol
    };

    const row = document.createElement('div');
    row.className = `incident-row priority-${pick.prio}`;
    row.id = `inc-${id}`;
    row.innerHTML = `
      <div class="incident-status-bar"></div>
      <div class="incident-details">
        <div class="incident-meta">
          <span class="badge ${pick.prio === 'high' ? 'badge-danger' : 'badge-warning'}">${pick.badge}</span>
          <span class="incident-time">Just Now</span>
          <span class="incident-loc"><i data-lucide="map-pin"></i> ${pick.loc}</span>
        </div>
        <h3 class="incident-title">${pick.title}</h3>
        <p class="incident-desc">${pick.desc}</p>
      </div>
      <button class="btn-incident-solve" data-incident-id="${id}">
        Run AI Mitigate <i data-lucide="zap"></i>
      </button>
    `;

    incidentContainer.insertBefore(row, incidentContainer.firstChild);
    lucide.createIcons();

    // Auto trigger solving of new incident
    row.querySelector('.btn-incident-solve').click();
  });

  // Run the default active incident on load
  runIncidentMitigation('1');

  // --- FAN HUB TAB CONTROLLER ---
  const fanTabs = [
    { btn: tabBtnAssistant, content: fanTabAssistant, name: 'assistant' },
    { btn: tabBtnNavigation, content: fanTabNavigation, name: 'navigation' },
    { btn: tabBtnSustainability, content: fanTabSustainability, name: 'sustainability' },
    { btn: tabBtnPredictions, content: fanTabPredictions, name: 'predictions' }
  ];

  fanTabs.forEach(tab => {
    tab.btn.addEventListener('click', () => {
      playRetroSound('beep');
      fanTabs.forEach(t => {
        t.btn.classList.remove('active');
        t.content.classList.remove('active-tab-content');
      });
      tab.btn.classList.add('active');
      tab.content.classList.add('active-tab-content');
      activeTab = tab.name;
    });
  });

  // --- MULTILINGUAL FAN CHAT CONCIERGE ---
  // Language button toggler
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playRetroSound('beep');
      langButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLanguage = btn.getAttribute('data-lang');
      
      // Update welcome message
      const welcomeMsg = chatbotLocales[currentLanguage].welcome;
      clearChatLog();
      appendChatBubble('ai', welcomeMsg);
    });
  });

  function clearChatLog() {
    chatMessagesLog.innerHTML = '';
  }

  function appendChatBubble(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}-bubble`;
    bubble.innerHTML = `
      <div class="chat-bubble-avatar"><i data-lucide="${sender === 'ai' ? 'cpu' : 'user'}"></i></div>
      <div class="chat-bubble-text">${text}</div>
    `;
    chatMessagesLog.appendChild(bubble);
    chatMessagesLog.scrollTop = chatMessagesLog.scrollHeight;
    lucide.createIcons();
  }

  // Handle send message logic
  btnChatSend.addEventListener('click', () => {
    playRetroSound('beep');
    submitUserQuery();
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitUserQuery();
    }
  });

  // Quick chips queries
  quickChips.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    playRetroSound('beep');
    const query = btn.getAttribute('data-query');
    chatInput.value = query;
    submitUserQuery();
  });

  async function submitUserQuery() {
    const query = chatInput.value.trim();
    if (!query) return;

    appendChatBubble('user', query);
    chatInput.value = '';

    // Show simulated typing status
    const typingBubble = document.createElement('div');
    typingBubble.className = `chat-bubble ai-bubble typing-bubble`;
    typingBubble.innerHTML = `
      <div class="chat-bubble-avatar"><i data-lucide="cpu"></i></div>
      <div class="chat-bubble-text">${chatbotLocales[currentLanguage].typing}</div>
    `;
    chatMessagesLog.appendChild(typingBubble);
    chatMessagesLog.scrollTop = chatMessagesLog.scrollHeight;
    lucide.createIcons();

    // Prepare Gemini Prompt Context
    const systemPrompt = `You are Vanguard Arena AI, the official tournament concierge for the FIFA World Cup 2026 at MetLife Stadium.
    You assist fans, volunteers, and organizers. You speak fluently in the requested language.
    
    Current Stadium Status:
    - Live Match: USA vs England (Score: 1-1, 74 mins). Total Attendance: 82,300.
    - Gate A (North): heavily congested (22m wait, due to scanner hardware connectivity drop). Advise fans to detour to Gate B.
    - Gate B (East): normal flow (4m wait). Recommend this gate for fastest entry/exit.
    - Gate C (South): moderate (11m wait).
    - Gate D (West): moderate (8m wait).
    - Sector 104: South-East quadrant, nearest to Gate B. Has accessible ramp 3 on the right and wheelchair platform seats at Row 12.
    - Restrooms: Concourse 102/103 is light queue (2m wait), Concourse 104 is congested (15m wait).
    - Concessions: Taco Arena at Sector 105 (8m wait), Beer Concession at Sector 104 (18m wait).
    - Transport: MetLife Rail connects to NYC Secaucus Junction (trains every 10m post-match). Buses/Shuttles leave from South Lot.
    
    Respond to the user's question directly in the requested language: "${currentLanguage}".
    Keep your answers clear, professional, and very concise (maximum of 3 sentences or a short bulleted list), unless they ask for specific complex directions. Make sure you use markdown bolding (e.g., **Gate B**) where appropriate. Do not output code blocks.`;

    let reply = "";
    try {
      reply = await queryGemini(systemPrompt, query);
    } catch (err) {
      console.warn("Gemini API call failed for chat. Using local response engine fallback.", err);
      reply = generateGenAIResponse(query);
    }

    // Remove typing bubble
    typingBubble.remove();
    appendChatBubble('ai', reply);
    
    // Auto narrate if speech synthesizer is free and supported
    speakAI(reply.replace(/\*\*|\*/g, ''));
  }

  function generateGenAIResponse(query) {
    const textLower = query.toLowerCase();
    
    // Check keywords
    let matchKey = '';
    if (textLower.includes('gate') || textLower.includes('puerta') || textLower.includes('portão') || textLower.includes('tor') || textLower.includes('porte') || textLower.includes('بوابة') || textLower.includes('ゲート')) {
      matchKey = 'gate';
    } else if (textLower.includes('sector') || textLower.includes('sección') || textLower.includes('setor') || textLower.includes('sektor') || textLower.includes('secteur') || textLower.includes('قطاع') || textLower.includes('セクター') || textLower.includes('104')) {
      matchKey = 'sector';
    } else if (textLower.includes('access') || textLower.includes('wheelchair') || textLower.includes('silla de ruedas') || textLower.includes('cadeira') || textLower.includes('barrierefrei') || textLower.includes('handicap') || textLower.includes('احتياجات') || textLower.includes('車椅子') || textLower.includes('バリアフリー')) {
      matchKey = 'accessibility';
    } else if (textLower.includes('transit') || textLower.includes('train') || textLower.includes('bus') || textLower.includes('transport') || textLower.includes('tren') || textLower.includes('ônibus') || textLower.includes('zug') || textLower.includes('نقل') || textLower.includes('電車') || textLower.includes('バス')) {
      matchKey = 'transit';
    }

    if (matchKey && searchKeywords[matchKey][currentLanguage]) {
      return searchKeywords[matchKey][currentLanguage];
    }

    // Generic simulated multilingual translation match
    const fallbacks = {
      en: "I've processed your query: your seat sector 104 is near Concourse Gate B. You can view the live queue times on the Wayfinding panel directly.",
      es: "He procesado tu consulta: tu sector 104 está cerca de la Puerta B. Puedes ver los tiempos de fila en el panel de Navegación.",
      pt: "Processei sua consulta: seu setor 104 fica próximo ao Portão B. Você pode ver os tempos de fila no painel de Navegação.",
      de: "Ich habe Ihre Anfrage verarbeitet: Ihr Sitzsektor 104 befindet sich in der Nähe von Tor B. Sie können die Wartezeiten im Navigationspanel einsehen.",
      fr: "J'ai traité votre demande : votre secteur 104 est proche de la Porte B. Vous pouvez voir les temps d'attente sur le panneau de navigation.",
      ar: "لقد عالجت طلبك: مقعدك في القطاع 104 يقع بالقرب من البوابة B. يمكنك مراجعة أوقات الانتظار في لوحة الملاحة.",
      ja: "お問い合わせ内容を確認しました。セクター104の座席はゲートBの近くにあります。詳細な道順はウェーファインダーパネルでご確認ください。",
      it: "Ho elaborato la tua richiesta: il tuo posto nel settore 104 è vicino al Cancello B del Concourse. Puoi vedere le attese in tempo reale sul pannello Navigazione.",
      zh: "已处理您的查询：您的座位104区靠近B口大厅。您可直接在导航面板上查看实时排队时间。",
      hi: "मैंने आपकी पूछताछ पर कार्रवाई की है: आपकी सीट सेक्टर 104 कॉनकोर्स गेट बी के पास है। आप सीधे नेविगेशन पैनल पर लाइव प्रतीक्षा समय देख सकते हैं।",
      ko: "문의 내용을 처리했습니다. 귀하의 좌석 104 구역은 게이트 B 부근입니다. 웨이파인더 패널에서 실시간 대기 시간을 확인해 주세요."
    };

    return fallbacks[currentLanguage] || fallbacks['en'];
  }

  // --- AUDIO SYNTHESIS & RECOGNITION (WEB SPEECH API) ---
  function speakAI(text) {
    if (speechSynth.speaking) {
      speechSynth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice locale
    const voiceLocales = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
      de: 'de-DE',
      fr: 'fr-FR',
      ar: 'ar-SA',
      ja: 'ja-JP',
      it: 'it-IT',
      zh: 'zh-CN',
      hi: 'hi-IN',
      ko: 'ko-KR'
    };
    utterance.lang = voiceLocales[currentLanguage] || 'en-US';
    speechSynth.speak(utterance);
  }

  // Speech Recognition integration
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    
    recognition.onstart = () => {
      isRecording = true;
      btnChatMic.classList.add('recording');
      chatInput.placeholder = chatbotLocales[currentLanguage].voiceStart;
    };

    recognition.onresult = (event) => {
      const voiceResult = event.results[0][0].transcript;
      chatInput.value = voiceResult;
    };

    recognition.onend = () => {
      isRecording = false;
      btnChatMic.classList.remove('recording');
      chatInput.placeholder = "Type a message or ask stadium questions...";
      submitUserQuery();
    };

    recognition.onerror = () => {
      isRecording = false;
      btnChatMic.classList.remove('recording');
      alert(chatbotLocales[currentLanguage].voiceError);
    };

    btnChatMic.addEventListener('click', () => {
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.lang = currentLanguage;
        recognition.start();
      }
    });
  } else {
    // If not supported, simulate a voice input
    btnChatMic.addEventListener('click', () => {
      btnChatMic.classList.add('recording');
      chatInput.value = "... simulating voice query for Gate queues ...";
      setTimeout(() => {
        btnChatMic.classList.remove('recording');
        submitUserQuery();
      }, 1500);
    });
  }

  // --- COORDINATE MAPPING FOR SVG MAP NAVIGATION PATHS ---
  const sectorCoords = {
    '101': { x: 490, y: 150 },
    '102': { x: 610, y: 200 },
    '103': { x: 500, y: 450 },
    '104': { x: 610, y: 400 },
    '105': { x: 290, y: 450 },
    '106': { x: 190, y: 400 },
    '107': { x: 290, y: 150 },
    '108': { x: 190, y: 200 }
  };

  const gateCoords = {
    'Gate A': { x: 400, y: 50 },
    'Gate B': { x: 730, y: 300 },
    'Gate C': { x: 400, y: 550 },
    'Gate D': { x: 70, y: 300 }
  };

  function drawRoutePath(gate, sector, accessible) {
    const gCoord = gateCoords[gate];
    const sCoord = sectorCoords[sector];
    if (!gCoord || !sCoord) return;
    
    const X0 = 400, Y0 = 300;
    const Rc = accessible ? 230 : 190; 
    
    const thetaGate = Math.atan2(gCoord.y - Y0, gCoord.x - X0);
    const thetaSec = Math.atan2(sCoord.y - Y0, sCoord.x - X0);
    
    const cx1 = X0 + Rc * Math.cos(thetaGate);
    const cy1 = Y0 + Rc * Math.sin(thetaGate);
    const cx2 = X0 + Rc * Math.cos(thetaSec);
    const cy2 = Y0 + Rc * Math.sin(thetaSec);
    
    let angleDiff = thetaSec - thetaGate;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    
    const largeArcFlag = Math.abs(angleDiff) > Math.PI / 2 ? 1 : 0;
    const sweepFlag = angleDiff > 0 ? 1 : 0;
    
    const pathD = `M ${gCoord.x} ${gCoord.y} L ${cx1.toFixed(1)} ${cy1.toFixed(1)} A ${Rc} ${Rc} 0 ${largeArcFlag} ${sweepFlag} ${cx2.toFixed(1)} ${cy2.toFixed(1)} L ${sCoord.x} ${sCoord.y}`;
    
    // 1. Background glow path
    let routePathGlow = document.getElementById('active-routing-path-glow');
    if (!routePathGlow) {
      routePathGlow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      routePathGlow.setAttribute('id', 'active-routing-path-glow');
      routePathGlow.setAttribute('class', 'active-routing-path-glow');
      stadiumMap.appendChild(routePathGlow);
    }
    routePathGlow.setAttribute('d', pathD);
    routePathGlow.style.display = 'block';

    // 2. Foreground dashed path
    let routePath = document.getElementById('active-routing-path');
    if (!routePath) {
      routePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      routePath.setAttribute('id', 'active-routing-path');
      routePath.setAttribute('class', 'active-routing-path');
      stadiumMap.appendChild(routePath);
    }
    routePath.setAttribute('d', pathD);
    routePath.style.display = 'block';
  }

  // --- SEAT WAYFINDING ROUTING ALGORITHM ---
  btnCalculateRoute.addEventListener('click', async () => {
    playRetroSound('beep');
    const gate = inputGate.value;
    const sector = inputSector.value;
    const accessible = checkboxWheelchair.checked;
    const preference = inputRoutePref.value;

    directionsOutputBox.style.display = 'block';
    directionsStepsList.innerHTML = `
      <li class="direction-step loading-step">
        <span class="ticker-live-dot blinking"></span> [CALCULATING OPTIMAL PATH VECTORS VIA GENAI...]
      </li>
    `;

    const systemPrompt = `You are Vanguard Arena AI Navigation Engine.
    Given an entry gate, seat sector, accessible requirement, and optimization preference, calculate the optimal walking path directions.
    
    Current Stadium Conditions:
    - Gate A (North): HEAVILY CONGESTED (22m wait, turnstile scanners offline). Detour incoming fans to Gate B or Gate D.
    - Gate B (East): STABLE (4m wait).
    - Gate C (South): MODERATE (11m wait).
    - Gate D (West): MODERATE (8m wait).
    - Sector 104: nearest to Gate B. Ramp 3 on the right is step-free.
    - Concourse restroom 104 has 15m wait. Restrooms near Sector 102/103 have 2m wait.
    - Budweiser Beer concession at Sector 104 has 18m wait. Concourse 105 Taco Arena has 8m wait.
    
    Return your output in a raw JSON string ONLY containing:
    {
      "time": number (minutes, e.g. 7),
      "distance": number (meters, e.g. 480),
      "steps": [
        "Step 1 text...",
        "Step 2 text..."
      ],
      "ecoTip": "Sustainability tip/advice..."
    }
    Do NOT output markdown code blocks. Give smart advice: e.g., if Gate A is selected, recommend detouring via Gate B or D due to offline scanners. If preference is 'green', suggest recycling spots or clean concessions. If accessible is checked, emphasize elevators and ramp 3.`;

    const userPrompt = `Calculate path from ${gate} to Sector ${sector}. Accessible/Step-Free: ${accessible}. Strategy Preference: ${preference}.`;
    
    let result = null;
    try {
      const responseText = await queryGemini(systemPrompt, userPrompt);
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      result = JSON.parse(cleanJson);
    } catch (err) {
      console.warn("Gemini API call failed for route planner. Simulating local routing.", err);
      result = simulateLocalRouting(gate, sector, accessible, preference);
    }

    directionsOutputBox.querySelector('.route-badge:first-child').innerHTML = `<i data-lucide="clock"></i> ${result.time} min walk`;
    directionsOutputBox.querySelector('.route-badge:last-child').innerHTML = `<i data-lucide="footprints"></i> ${result.distance} meters`;

    directionsStepsList.innerHTML = '';
    
    result.steps.forEach((step, idx) => {
      setTimeout(() => {
        const li = document.createElement('li');
        li.className = 'direction-step';
        li.innerHTML = `<span class="step-num">${idx + 1}.</span> ${step}`;
        directionsStepsList.appendChild(li);
        playRetroSound('boop');
      }, idx * 250);
    });

    if (result.ecoTip) {
      setTimeout(() => {
        const li = document.createElement('li');
        li.className = 'direction-step eco-route-tip';
        li.innerHTML = `<i data-lucide="leaf" class="icon-green"></i> <strong>AI ECO ADVICE:</strong> ${result.ecoTip}`;
        directionsStepsList.appendChild(li);
        lucide.createIcons();
        playRetroSound('success');
      }, result.steps.length * 250 + 100);
    }

    drawRoutePath(gate, sector, accessible);
    appendLiveEvent('nav', `AI routed user from ${gate} to Sec ${sector} (${preference} mode, ${result.time}m).`);

    lucide.createIcons();
    speakAI(`Optimal path generated: ${result.time} minutes walk.`);
  });

  function simulateLocalRouting(gate, sector, accessible, preference) {
    let time = 6;
    let distance = 420;
    const steps = [];
    let ecoTip = "";

    const gateLetters = { 'Gate A': 3, 'Gate B': 6, 'Gate C': 9, 'Gate D': 12 };
    time = Math.max(3, gateLetters[gate] || 5);
    if (accessible) time += 2;
    distance = time * 75;

    if (gate === 'Gate A') {
      steps.push(`ALERT: Turnstile scanners offline at ${gate}. Divert to Gate B (East) to bypass 22m delay.`);
      steps.push(`Proceed through Gate B check-in checkpoints.`);
      time += 4;
      distance += 250;
    } else {
      steps.push(`Enter stadium via ${gate}. Scan your digital World Cup ticket.`);
    }

    steps.push(`Walk to the Concourse corridor level.`);

    if (preference === 'green') {
      steps.push(`Pass the solar-awning canopy station. Scan the green QR code to log travel stats.`);
      steps.push(`Grab a cold drink at Sector 102/103 concessions (compostable packaging used).`);
      ecoTip = "Bringing a stadium-approved clear bottle prevents cup waste. Filtered water fountains are free at Gate B concourses!";
    }

    if (accessible) {
      steps.push(`Take the Express elevator near Sector 102 to Level 1.`);
      steps.push(`Use Accessible Ramp 3 on the right side of Portal 104.`);
      steps.push(`Go directly to Seat Wheelchair Platform Row 12.`);
    } else {
      steps.push(`Go through Sector ${sector} seating portal.`);
      steps.push(`Walk down steps to Row 12, Seat 4.`);
    }

    if (!ecoTip) {
      ecoTip = "Using Gate B east walkways reduces queue bottlenecks by 75% compared to northern tunnels.";
    }

    return { time, distance, steps, ecoTip };
  }

  // --- GREEN PLAY SUSTAINABILITY LOGIC ---
  btnCalculateEco.addEventListener('click', () => {
    playRetroSound('beep');
    const selectedOption = selectTransitMode.options[selectTransitMode.selectedIndex];
    const pointsToAdd = parseInt(selectedOption.getAttribute('data-points')) || 0;
    const co2Saved = selectedOption.getAttribute('data-co2');

    totalEcoPoints += pointsToAdd;
    
    greenScoreStat.querySelector('.fan-stat-val').textContent = `${totalEcoPoints} pts`;
    document.querySelector('.eco-circle-value').textContent = totalEcoPoints;

    alert(`Success: logged travel! Earned +${pointsToAdd} Eco Points. Total: ${totalEcoPoints} pts.`);
    
    if (totalEcoPoints >= 200) {
      document.querySelector('.eco-stat-details h3').textContent = "Carbon Saver Tier: Platinum Champion";
    }

    playRetroSound('success');
    speakAI(chatbotLocales[currentLanguage].ecoSuccess);
  });

  btnNewEcoTip.addEventListener('click', () => {
    playRetroSound('beep');
    const tip = dynamicEcoTips[Math.floor(Math.random() * dynamicEcoTips.length)];
    ecoTipBox.innerHTML = `"${tip}"`;
    playRetroSound('success');
    speakAI(tip);
  });

  // --- GLOBAL ACCESSIBILITY FLOATING BUTTON CONTROLLER ---
  btnAccessibilityMode.addEventListener('click', () => {
    playRetroSound('beep');
    document.body.classList.toggle('accessibility-mode');
    if (document.body.classList.contains('accessibility-mode')) {
      btnAccessibilityMode.innerHTML = `<i data-lucide="eye"></i> Normal Contrast`;
      clearRoutePath();
      speakAI("Accessibility mode enabled. Large text and high contrast borders loaded. CRT overlay effects and sound alarms deactivated.");
    } else {
      btnAccessibilityMode.innerHTML = `<i data-lucide="accessibility"></i> Accessibility Mode`;
      speakAI("Returned to standard interface layout.");
    }
    lucide.createIcons();
  });

  // --- FLOATING CHATBOT WIDGET ENGINE ---
  const btnChatbotToggle = document.getElementById('btn-chatbot-toggle');
  const chatbotWindow = document.getElementById('chatbot-window');
  const btnChatbotClose = document.getElementById('btn-chatbot-close');
  const chatbotInputFloat = document.getElementById('chatbot-input-float');
  const btnChatbotSendFloat = document.getElementById('btn-chatbot-send-float');
  const chatbotMessagesFloatLog = document.getElementById('chatbot-messages-float-log');
  const langButtonsFloat = document.querySelectorAll('.lang-btn-float');

  // Toggle Visibility
  btnChatbotToggle.addEventListener('click', () => {
    playRetroSound('beep');
    if (chatbotWindow.style.display === 'none') {
      chatbotWindow.style.display = 'flex';
      btnChatbotToggle.innerHTML = `<i data-lucide="x"></i> Close Chat`;
      lucide.createIcons();
    } else {
      chatbotWindow.style.display = 'none';
      btnChatbotToggle.innerHTML = `<i data-lucide="sparkles"></i> AI Concierge`;
      lucide.createIcons();
    }
  });

  btnChatbotClose.addEventListener('click', () => {
    playRetroSound('beep');
    chatbotWindow.style.display = 'none';
    btnChatbotToggle.innerHTML = `<i data-lucide="sparkles"></i> AI Concierge`;
    lucide.createIcons();
  });

  // Language selectors in float chat
  langButtonsFloat.forEach(btn => {
    btn.addEventListener('click', () => {
      playRetroSound('beep');
      langButtonsFloat.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLanguage = btn.getAttribute('data-lang');
      
      // Update welcome in float chat
      chatbotMessagesFloatLog.innerHTML = `
        <div class="chat-bubble ai-bubble">
          <div class="chat-bubble-avatar"><i data-lucide="cpu"></i></div>
          <div class="chat-bubble-text">
            ${chatbotLocales[currentLanguage].welcome}
          </div>
        </div>
      `;
      lucide.createIcons();
    });
  });

  btnChatbotSendFloat.addEventListener('click', () => {
    playRetroSound('beep');
    submitFloatUserQuery();
  });

  chatbotInputFloat.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      playRetroSound('beep');
      submitFloatUserQuery();
    }
  });

  async function submitFloatUserQuery() {
    const query = chatbotInputFloat.value.trim();
    if (!query) return;

    // Append user bubble to float log
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user-bubble';
    userBubble.innerHTML = `
      <div class="chat-bubble-avatar"><i data-lucide="user"></i></div>
      <div class="chat-bubble-text">${query}</div>
    `;
    chatbotMessagesFloatLog.appendChild(userBubble);
    chatbotInputFloat.value = '';
    chatbotMessagesFloatLog.scrollTop = chatbotMessagesFloatLog.scrollHeight;
    lucide.createIcons();

    // Show typing status in float log
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble ai-bubble typing-bubble';
    typingBubble.innerHTML = `
      <div class="chat-bubble-avatar"><i data-lucide="cpu"></i></div>
      <div class="chat-bubble-text">${chatbotLocales[currentLanguage].typing}</div>
    `;
    chatbotMessagesFloatLog.appendChild(typingBubble);
    chatbotMessagesFloatLog.scrollTop = chatbotMessagesFloatLog.scrollHeight;
    lucide.createIcons();

    // Context System Instructions
    const systemPrompt = `You are Vanguard Arena AI, the official tournament concierge for the FIFA World Cup 2026 at MetLife Stadium.
    You assist fans, volunteers, and organizers. You speak fluently in the requested language.
    
    Current Stadium Status:
    - Live Match: USA vs England (Score: 1-1, 74 mins). Total Attendance: 82,300.
    - Gate A (North): heavily congested (22m wait, due to scanner hardware connectivity drop). Advise fans to detour to Gate B.
    - Gate B (East): normal flow (4m wait). Recommend this gate for fastest entry/exit.
    - Gate C (South): moderate (11m wait).
    - Gate D (West): moderate (8m wait).
    - Sector 104: South-East quadrant, nearest to Gate B. Has accessible ramp 3 on the right and wheelchair platform seats at Row 12.
    - Restrooms: Concourse 102/103 is light queue (2m wait), Concourse 104 is congested (15m wait).
    - Concessions: Taco Arena at Sector 105 (8m wait), Beer Concession at Sector 104 (18m wait).
    - Transport: MetLife Rail connects to NYC Secaucus Junction (trains every 10m post-match). Buses/Shuttles leave from South Lot.
    
    Respond to the user's question directly in the requested language: "${currentLanguage}".
    Keep your answers clear, professional, and very concise (maximum of 3 sentences or a short bulleted list), unless they ask for specific complex directions. Make sure you use markdown bolding (e.g., **Gate B**) where appropriate. Do not output code blocks.`;

    let reply = "";
    try {
      reply = await queryGemini(systemPrompt, query);
    } catch (err) {
      console.warn("Gemini API call failed for float chat. Using local fallback.", err);
      reply = generateGenAIResponse(query);
    }

    typingBubble.remove();

    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble ai-bubble';
    aiBubble.innerHTML = `
      <div class="chat-bubble-avatar"><i data-lucide="cpu"></i></div>
      <div class="chat-bubble-text">${reply}</div>
    `;
    chatbotMessagesFloatLog.appendChild(aiBubble);
    chatbotMessagesFloatLog.scrollTop = chatbotMessagesFloatLog.scrollHeight;
    lucide.createIcons();

    speakAI(reply.replace(/\*\*|\*/g, ''));
  }

  // --- GEMINI COGNITIVE MODEL & CROWD PREDICTIONS HUB ---
  btnRunPredictions.addEventListener('click', async () => {
    playRetroSound('beep');
    predictionsLoader.style.display = 'block';
    predictionsOutputContainer.style.display = 'none';
    predictionsProgressFill.style.width = '0%';
    
    // Animate progress bar simulation
    let width = 0;
    const interval = setInterval(() => {
      width += Math.floor(Math.random() * 15) + 6;
      if (width >= 100) {
        width = 100;
        clearInterval(interval);
      }
      predictionsProgressFill.style.width = `${width}%`;
    }, 80);

    const systemPrompt = `You are the Vanguard Arena AI Cognitive Engine.
    Compile a stadium operations predictive report for the FIFA World Cup 2026.
    Use current telemetry conditions to formulate recommendations.
    Current Stadium Telemetry:
    - Gate A: heavily congested (22m wait, scanners offline).
    - Gate B: normal flow (4m wait).
    - Gate C: moderate (11m wait).
    - Gate D: moderate (8m wait).
    - Sector 104 restroom: 15m wait. Sector 102/103 restrooms: 2m wait.
    - Concession Sector 104: 18m wait. Concession Sector 105: 8m wait.
    - Match: USA vs England (Score 2-1, 76 mins, crowd density high).
    - Weather: Wind gusting 15mph, light rain forecast, roof open.
    
    Your report must contain:
    1. **Rerouting Directive**: Clear, actionable rerouting of incoming gate traffic (recommending Gate B/D detours).
    2. **Optimal Concessions/Facilities**: Points fans towards under-utilized concessions and restrooms (e.g. Sector 102/103 to avoid Sector 104 restroom bottleneck).
    3. **Crowd Density Predictions**: Predicts restroom, gate, and transit bottleneck flows for the next 30 minutes (post-match egress).
    
    Format your output in raw HTML containing ONLY <h4> heading starting with "GenAI Operations Strategy" and a <ul> list containing several <li> items.
    Do NOT wrap output in markdown blocks like \`\`\`html. Keep it highly tactical, professional, and very concise.`;

    const userPrompt = "Generate real-time crowd forecasts, optimal gates, and concession load predictions.";

    let predictionHtml = "";
    try {
      predictionHtml = await queryGemini(systemPrompt, userPrompt);
    } catch (err) {
      console.warn("Gemini predictions call failed. Simulating local analytical model.", err);
      predictionHtml = simulateLocalPredictions();
    }

    setTimeout(() => {
      clearInterval(interval);
      predictionsProgressFill.style.width = '100%';
      
      setTimeout(() => {
        predictionsLoader.style.display = 'none';
        predictionsOutputContainer.style.display = 'block';
        predictionsAiContent.innerHTML = predictionHtml;
        playRetroSound('success');
        speakAI("AI crowd prediction and gate recommendation completed.");
        appendLiveEvent('system', "Gemini operational crowd analysis loaded successfully.");
      }, 150);
    }, 1000);
  });

  function simulateLocalPredictions() {
    return `<h4>GenAI Operations Strategy Recommendation</h4>
<ul>
  <li><strong>Optimal Gate Recommendation:</strong> Direct all incoming pedestrian corridors to <strong>Gate B (East)</strong> (4m wait) and <strong>Gate D (West)</strong> (8m wait). Staggered Gate A closures should continue until scanner WAN switch recovery completes.</li>
  <li><strong>Concessions & Facilities Rerouting:</strong> Alert fans in Sector 104 to proceed to <strong>Sector 102/103 restroom facilities</strong> (2m wait vs 15m wait at 104). Reroute beer demand from Sector 104 stand to Sector 105 Taco & Beer counter (wait differential: 10 mins saved).</li>
  <li><strong>Egress Surge Forecast (Next 30m):</strong> Post-match egress will peak at <strong>90+5' (approx. 18 minutes from now)</strong>. Heavy crowd density predicted at <strong>Gate B rail transit platform</strong> (+25 min queuing backlog). Recommending bus lot shuttles or NJ Transit staggering alerts.</li>
</ul>`;
  }
});
