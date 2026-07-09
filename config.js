/**
 * Centralized configuration settings and localization strings.
 */
"use strict";

export const sectorCoords = {
  '101': { x: 490, y: 150 },
  '102': { x: 610, y: 200 },
  '103': { x: 500, y: 450 },
  '104': { x: 610, y: 400 },
  '105': { x: 290, y: 450 },
  '106': { x: 190, y: 400 },
  '107': { x: 290, y: 150 },
  '108': { x: 190, y: 200 }
};

export const gateCoords = {
  'Gate A': { x: 400, y: 50 },
  'Gate B': { x: 730, y: 300 },
  'Gate C': { x: 400, y: 550 },
  'Gate D': { x: 70, y: 300 }
};

export const incidentResolutions = {
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

export const dynamicEcoTips = [
  "By choosing the rail network from Manhattan/Secaucus Junction, you minimized parking logistics and queue emissions. Remember, MetLife Stadium offers free water refills in Concourse A & C when you bring a reusable stadium-approved clear bottle!",
  "Stadium recycling challenge: MetLife Stadium features compostable packaging at 80% of our concessions. Place cups in the Green Bins to earn double 'Green Play' points when validated by volunteer scanners!",
  "Going carpool: Sharing rides with 3+ friends reduced your travel carbon footprint by 64%. Scan the carpool registration code at the Gate B parking terminal to log your group points!",
  "Solar canopy energy: Gate B's solar awning has generated over 420 kWh of electricity today, fully powering the stadium's fan concierge terminals and wayfinding displays!"
];

export const chatbotLocales = {
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
    welcome: "FIFAワールドカップ2026 メットライフ・スタジアムへようこそ！私はAI大会コンシェルジュです。座席의 안내、ゲート의 혼잡 상황、バリアフリールート의 검색 등、何でもお手伝いいたします。",
    typing: "AI가 생각하고 있습니다...",
    voiceStart: "음성 인식 중... 말씀하세요.",
    voiceError: "음성이 감지되지 않았습니다. 텍스트 입력을 시도해 보세요.",
    directionsTitle: "AI에 의한 루트 안내가 생성되었습니다",
    stepGate: "게이트 B(동쪽)로 입장하여 팬존 티켓 판매처를 통과합니다.",
    stepConcourse: "중앙 엘리베이터를 타고 콘코스 레벨 1로 올라갑니다.",
    stepTurn: "콘코스 B 매점에서 왼쪽으로 돕니다.",
    stepRamp: "포털 104를 통해 섹터 104 좌석 구역으로 들어갑니다.",
    stepWheelchair: "우측 배리어 프리 슬로프 3을 따라 열 12 휠체어 구역으로 직행합니다.",
    stepSeat: "좌석은 열 12, 4번입니다.",
    ecoSuccess: "교통수단 기록 완료! 에코 포인트가 적립되었습니다."
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
    welcome: "欢迎来到大都会人寿体育场参加2026年FIFA世界杯！我是您的GenAI赛事助手。今天我该如何帮您寻找座位、检查登机口延迟 or 跟踪无障碍通道？",
    typing: "GenAI 正在思考...",
    voiceStart: "正在聆听... 请讲话。",
    voiceError: "未检测到语音输入。请尝试输入文字。",
    directionsTitle: "AI 生成的路线导向",
    stepGate: "通过 B 号门（东口）进入。经过 FIFA 粉丝区售票处。",
    stepConcourse: "乘坐主电梯前往大厅 1 层。",
    stepTurn: "在 Concourse B 餐饮柜台处向左转。",
    stepRamp: "从 104 号门进入 104 区观众席。",
    stepWheelchair: "走右侧 of 3 号无障碍坡道，直接前往第 12 排轮椅专用平台。",
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

export const searchKeywords = {
  gate: {
    en: "Based on current stadium telemetry, **Gate B (East)** offers the shortest queue time of **4 minutes**. Gate A (North) is heavily congested with a **22 minute wait** due to offline scanners. We recommend rerouting via Gate B if possible.",
    es: "Según la telemetría del estadio, la **Puerta B (Este)** ofrece el tiempo de espera más corto de **4 minutos**. La Puerta A (Norte) está congestionada con **22 minutos de espera** debido a escáneres fuera de línea.",
    pt: "De acordo com os sensores, o **Portão B (Leste)** oferece o menor tempo de espera (**4 minutos**). O Portão A (Norte) está congestionado com **22 minutos**.",
    de: "Gemäß der Stadionmessung hat **Tor B (Ost)** die kürzeste Wartezeit von **4 Minuten**. Tor A (Nord) is stark überlastet (Wartezeit **22 Minuten**).",
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
    fr: "♿ Le MetLife Stadium propose des itinéraires sans marches pour tous les secteurs. Des ascenseurs adaptés sono situés près des Portes B, C et D. Le Portail 104 dispose de sièges PMR à la rangée 12.",
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
    ja: "スタジアム発ニューヨーク（セコーカスジャンクション）行きの直行列車が運行しています。試合後は10分간격으로 운행됩니다. 셔틀버스는 남쪽 주차장에서 출발합니다."
  }
};

export const fallbackLocales = {
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

export const customIncidentsList = [
  { badge: "IoT Surge", loc: "Concourse Sec 103", prio: "warning", title: "CCTV Concourse Switch Packet Collision", desc: "Abnormal UDP multicast storm from smart turnstile hubs saturating visual feed buffers.", sol: `<h4>GenAI Network Recovery Protocol</h4>
<ul>
  <li><strong>Broadcast Restriction:</strong> Dispatch volunteer leads to execute physical IGMP snooping triggers on Local Switch Port 12.</li>
  <li><strong>Bandwidth Containment:</strong> Apply stadium WAN traffic shaping to throttle smart turnstile streaming down to 2Mbps.</li>
  <li><strong>Local Routing Detour:</strong> Force visual loops to fail over to wireless visual backup system Sec 103-B.</li>
</ul>` },
  { badge: "Logistics", loc: "Access Road North", prio: "warning", title: "Team Shuttle Escort Delays", desc: "VIP transport lanes blocked by NJ Transit bus parking overflow at North checkpoint.", sol: `<h4>GenAI Logistics Recovery Plan</h4>
<ul>
  <li><strong>Escort Realignment: NJ State Police escort advised to switch team transport vehicles to Emergency Lane #3.</strong></li>
  <li><strong>Traffic Staggering: NJ Transit bus arrivals paused for 4 minutes to vent the highway access bottlenecks.</strong></li>
  <li><strong>Gate Diverting: Redirect fan pedestrian crosswalk paths to Gate D bypass overhead ramp.</strong></li>
</ul>` },
  { badge: "Severe Weather", loc: "MetLife Roof Gantry", prio: "high", title: "Lightning Warning (8-Mile Perimeter)", desc: "National Weather Service indicates active electrical cells moving South-East. Roof retraction required.", sol: `<h4>Severe Weather Containment Matrix</h4>
<ul>
  <li><strong>Mechanical Actuation: RETRACT STADIUM ROOF IMMEDIATELY (Approx. 11 minutes total cycle completion).</strong></li>
  <li><strong>Concourse Shelter Directive: Disseminate PA alerts advising fans in open-air upper decks to seek refuge inside lower concourses.</strong></li>
  <li><strong>Staff Reallocation: Direct outdoor field perimeter security personnel to report to indoor shelter zones.</strong></li>
</ul>` }
];

export const retroLiveEventsPool = [
  { type: 'match', text: "76' - Foul by Bellingham (England) on Musah near penalty area." },
  { type: 'weather', text: "WEATHER: Wind gusting 15mph NW. Temperature: 68°F. Retractable canopy stays open." },
  { type: 'alert', text: "Gate B ticket scanner lines dropping. Average wait time now: 3 mins." },
  { type: 'transit', text: "TRANSIT: MetLife Rail Shuttle reports trains to Secaucus running on 8 min headways." },
  { type: 'security', text: "SECURITY: Sector 104 volunteers matching crowd diversion directives. Gates clear." },
  { type: 'nav', text: "AI navigation routing recommends Gate B detour for Sectors 103, 104." },
  { type: 'match', text: "79' - Close! Header by Kane (England) hits the crossbar!" },
  { type: 'transit', text: "TRANSIT: Main parking lot outbound lanes showing normal congestion levels." },
  { type: 'alert', text: "Gate A ticket gate operations recovered. Switch port Cellular WAN #2 stable." },
  { type: 'match', text: "90' - Fourth Official indicates 5 minutes of added time." },
  { type: 'match', text: "90+2' - Corner kick for England. Pressure mounting in USA area." },
  { type: 'match', text: "90+5' - FULL TIME! USA defeats England 2-1 in a thrilling Group match!" }
];
