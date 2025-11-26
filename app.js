import React, { useState, useEffect, useCallback } from 'react';
import {
    getFirestore, collection, onSnapshot, doc, getDoc,
} from 'firebase/firestore';
import {
    initializeApp // Bu import firebase/app'ten gelmeliydi.
} from 'firebase/app'; // Bu satır eklendi
import {
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut
} from 'firebase/auth';
import { BookOpen, Cpu, Wrench, Zap, Layers, FileText, Menu, X, Globe } from 'lucide-react';

// Firebase Setup (Mandatory for professional apps)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cnc-design-handbook';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Helper function to simulate a Markdown renderer
const ContentRenderer = ({ content }) => {
    // Simple markdown simulation for headers and paragraphs
    return content.split('\n\n').map((block, index) => {
        if (block.startsWith('## ')) {
            return <h2 key={index} id={block.substring(3).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '')} className="text-2xl font-semibold mt-8 mb-4 border-b pb-2 text-indigo-400">{block.substring(3)}</h2>;
        }
        if (block.startsWith('### ')) {
            return <h3 key={index} id={block.substring(4).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '')} className="text-xl font-medium mt-6 mb-3 text-gray-300">{block.substring(4)}</h3>;
        }
        if (block.startsWith('* ')) {
            const listItems = block.split('\n').filter(line => line.startsWith('* ')).map((item, i) => (
                <li key={i} className="mb-2 ml-4 list-disc">{item.substring(2)}</li>
            ));
            return <ul key={index} className="pl-5 mb-4 text-gray-400">{listItems}</ul>;
        }
        if (block.startsWith('![](')) {
             // Simulate Image tag processing
             const match = block.match(/!\[(.*?)\]\((.*?)\)/);
             if (match) {
                 return <p key={index} className="my-4 p-4 bg-gray-700/50 rounded-lg border border-indigo-600/50 text-center italic text-sm text-yellow-300">{match[1]}</p>;
             }
        }
        // LaTeX Math Rendering Simulation
        // Inline math: $...$
        let renderedBlock = block.replace(/\$([^\n\$]+)\$/g, (match, p1) => 
            `<span class="bg-gray-700 px-1 py-0.5 rounded text-yellow-300 font-mono italic">${p1}</span>`
        );
        // Display math: $$...$$ (replaces with a block for emphasis)
        renderedBlock = renderedBlock.replace(/\$\$([^\n\$]+)\$\$/g, (match, p1) => 
            `<div class="my-3 p-3 bg-gray-700 rounded-lg text-lg text-yellow-300 font-mono text-center overflow-x-auto">${p1}</div>`
        );

        return <p key={index} className="mb-4 leading-relaxed text-gray-400" dangerouslySetInnerHTML={{ __html: renderedBlock }} />;
    });
};

const SECTIONS = {
    INTRO: 'Giriş',
    CNC_BASICS: 'CNC Parça Bağlama Temelleri',
    ROBOT_FIXTURES: 'Robot Kaynak Fikstür Tasarımı',
    DESIGN_GUIDELINES: 'Tasarımda Dikkat Edilecekler',
    CASE_STUDIES: 'Gerçek Örnekler (Vaka)',
    DOCUMENTATION: 'Dokümantasyon & PDF',
};

const MENU_ITEMS = [
    { id: SECTIONS.INTRO, icon: BookOpen },
    { id: SECTIONS.CNC_BASICS, icon: Cpu },
    { id: SECTIONS.ROBOT_FIXTURES, icon: Wrench },
    { id: SECTIONS.DESIGN_GUIDELINES, icon: Zap },
    { id: SECTIONS.CASE_STUDIES, icon: Layers },
    { id: SECTIONS.DOCUMENTATION, icon: FileText },
];

// --- EXTENSIVE TECHNICAL CONTENT IN TURKISH ---

const CONTENT = {
    [SECTIONS.INTRO]: `
## Giriş: Üretim Mühendisliğinde Fikstürün Yeri

Üretim mühendisliğinde fikstür ve parça bağlama (workholding) sistemleri, ürün kalitesini, verimliliğini ve maliyetini doğrudan etkileyen en kritik unsurlardır. Yüksek hassasiyetli CNC işleme ve otomatize robotik kaynak işlemleri, tasarlanan fikstürün sağlamlığına, tekrarlanabilirliğine ve ergonomisine bağlıdır.

### CNC'de Parça Bağlamanın Önemi
CNC işleme sırasında parça, kesme kuvvetlerine karşı pozisyonunu korumak zorundadır. Yanlış bağlama, titreşimlere, yüzey kalitesinin düşmesine, tolerans dışı parçaların üretilmesine ve hatta takım kırılmasına yol açar. Doğru bağlama, hızlı yükleme/boşaltma ve mükemmel parça tekrar konumlandırması (repeatability) sağlar.

### Robot Kaynak Fikstürlerinin Üretimdeki Rolü
Robotik kaynakta, fikstür, kaynaklanacak parçaları nominal pozisyonlarında tutar ve kaynak sırasındaki termal distorsiyonu (çarpılma) kontrol altında tutar. Fikstür tasarımı, robotun kaynak torçuna erişilebilirliğini (reachability) maksimize etmeli ve çevrim süresini düşürmelidir. Robotik sistemlerde hassasiyet fikstürden başlar.

### Tasarım Kriterlerinin Genel Çerçevesi
* **Hassasiyet (Accuracy):** Parçayı istenen tolerans dahilinde konumlandırma.
* **Tekrarlanabilirlik (Repeatability):** Her döngüde aynı pozisyonu sağlayabilme.
* **Rijitlik (Rigidity):** İşleme/kaynak kuvvetlerine karşı deformasyon göstermeme.
* **Ergonomi:** Operatör için kolay ve hızlı yükleme/boşaltma.
* **Maliyet Etkinliği:** Fikstür maliyeti, ünite başına düşen parça maliyetini optimize etmeli.
`,
    [SECTIONS.CNC_BASICS]: `
## CNC Parça Bağlama (Workholding) Temelleri

CNC işleme fikstürlerinin temel amacı, parçanın altı serbestlik derecesini (6 DOF: X, Y, Z - Lineer ve A, B, C - Rotasyonel) güvenli bir şekilde ortadan kaldırmaktır.

### 3-2-1 Kuralı (Locating Principle)
3-2-1 kuralı, her bir serbestlik derecesini sırayla kilitleyen minimum ve yeterli konumlandırma noktası sayısını tanımlar:

* **3 Nokta (Birincil Referans Düzlemi):** Parçanın en büyük düzlemine temas eden 3 nokta (X, Y, Z rotasyonlarını kilitler). Genellikle Z ekseni doğrultusunu kısıtlar.
* **2 Nokta (İkincil Referans Düzlemi):** Birincil düzleme dik olan bir kenara temas eden 2 nokta (kalan bir rotasyon ve bir lineer hareketi kilitler, örneğin Y rotasyonu ve X lineer).
* **1 Nokta (Üçüncül Referans Düzlemi):** Kalan son kenara temas eden 1 nokta (son lineer hareketi kilitler, örneğin Y lineer).

![(Image of 3-2-1 kuralının geometrik gösterimi, 3 noktanın alt düzlemde, 2 noktanın yan kenarda ve 1 noktanın diğer yan kenarda olduğu basit bir kübik parça şeması.)](3-2-1 kuralının geometrik gösterimi)

### Sabitleme Noktaları ve Referans Yüzeyi Seçimi
Referans yüzeyleri (Datum Surfaces), genellikle ilk operasyonda işlenen kritik yüzeyler veya döküm/dövme parçalarında tutarlı, bozulmamış yüzeyler olmalıdır. Sabitleme (clamping) kuvvetleri, parçayı *konumlandırma* noktalarına doğru itmelidir, parçayı *yerinden kaldırmamalıdır*.

### Vize ve Çene Tasarım Örnekleri
* **Yumuşak Çeneler (Soft Jaws):** Tekrarlanabilirliği artırmak ve parça deformasyonunu önlemek için özel parça geometrisine göre işlenen alüminyum veya pirinç çenelerdir. İşleme sırasında deformasyon tahminine göre çene tasarımı yapılmalıdır.
* **Sıkma Kuvveti Hesap Örneği:**
    $$\mathbf{F}_{\mathbf{c}} \geq \mathbf{k} \cdot \mathbf{F}_{\mathbf{kesme}} / \mu$$
    Burada $F_c$ sıkma kuvveti, $F_{kesme}$ maksimum kesme kuvveti, $k$ güvenlik faktörüdür (genellikle $1.5$ - $3.0$) ve $\mu$ sürtünme katsayısıdır. $F_{kesme}$ tornalamada teğetsel, frezelemede radyal ve teğetsel bileşenlerin vektörel toplamı olarak bulunur. Güvenli sıkma kuvveti, kaymaya karşı direnci sağlamalıdır.

### Hidrolik / Pnömatik Bağlama Prensipleri
Otomasyon için hidrolik ve pnömatik sistemler kullanılır. Bu sistemler, yüksek ve tutarlı sıkma kuvvetini (hidrolik) veya hızlı, düşük kuvvetli sıkmayı (pnömatik) sağlar. Hidrolik sistemler, çok noktalı bağlamada basınç eşitleme valfleri ile her noktaya eşit kuvvet dağılımı sağlayarak deformasyonu minimize eder.

### Deformasyon Tahmini ve Tolerans Analizi
Kesme kuvvetlerinin etkisi altında parçanın ve fikstürün esnemesi (deflection), son ürün toleransını bozar. Bu durum, Sonlu Elemanlar Analizi (FEA) ile tahmin edilmelidir. Fikstürün rijitliği, $\delta = \frac{F}{k}$ ( $k$: fikstür rijitliği) formülüne göre deformasyonu $\delta$ en aza indirmelidir.
`,
    [SECTIONS.ROBOT_FIXTURES]: `
## Robot Kaynak Fikstür Tasarımı

Robot kaynak fikstürleri, parçaları kaynak öncesi, sırası ve sonrası pozisyonda tutarken, robot kolunun ve torcun tüm kaynak yollarına engelsiz erişimini sağlamak zorundadır.

### Minimum 6 Serbestlik Derecesi Kuralı (Robotics Context)
Kaynak fikstürleri, parçanın tüm 6 serbestlik derecesini (konumlandırma) kilitlerken, aynı zamanda kaynak edilecek alanları ve sıkıştırma elemanlarını robot erişiminden uzak tutmalıdır. Robot erişilebilirliği (Reachability), robotun iş zarfı (working envelope) içinde, torç açısı ve yaklaşma açısı kısıtlamaları dahilinde tüm kaynak dikişlerine ulaşabilmesini ifade eder.

### Parça Konumlandırma Stratejileri
* **Birincil/İkincil/Üçüncül Konumlandırma:** CNC'deki 3-2-1'e benzer şekilde, parçalar büyük, referans alınması kolay ve tekrarlanabilir yüzeylerden hizalanır.
* **Datum/Pilot Pinler:** Konik (conical) pinler ve eliptik (diamond) pinler kullanılır. Konik pin (round pin) iki ekseni (X, Y) kilitlerken, eliptik pin (diamond pin) sadece bir ekseni (X) kilitler ve montaj kolaylığı için yuvadaki toleransı absorbe eder.
* **Nests (Yuvalar):** Kompleks şekilli parçaların tabanlarını veya kenarlarını desteklemek için kullanılan konturlu desteklerdir.

### Distorsiyon (Çarpılma) Kontrolü
Kaynak sırasında ortaya çıkan yüksek ısı, parçalarda büzülmeye ve çarpılmaya neden olur. Distorsiyon kontrolü:
* **Sıkı Sıkıştırma (Over-clamping):** Distorsiyonun ters yönünde ön yükleme (pre-loading) yaparak veya yeterli sıkıştırma kuvveti uygulayarak distorsiyonu sınırlar.
* **Isı Yönetimi:** Kaynak sırasını optimize ederek (ters-kaynak, atlamalı-kaynak) ısı yığılmasını dağıtmak.

### Jig Elemanları: Pins, Clamps, Nests
* **Sıkıştırma Elemanları (Clamps):** Pnömatik veya manuel mandallar, parçayı konumlandırma noktalarına doğru basılı tutmalıdır. Hızlı, tek hareketle açılıp kapanabilen mekanizmalar tercih edilir.
* **Parça Erişilebilirliği (Reachability) ve Robot Kolu Zon Analizleri:** Fikstür, robot kolunun potansiyel çarpışma yollarını (collision zones) en aza indirmelidir. Simülasyon yazılımları (örneğin FANUC ROBOGUIDE, KUKA Sim Pro) ile **kaynak torçunun ulaşma açısı (örneğin $\pm 15$ derece)** ve fikstürdeki potansiyel çarpma noktaları önceden analiz edilir.

![(Image of Tipik bir robot kaynak fikstüründe konik ve eliptik pinlerin kullanımı ve hızlı sıkıştırma mekanizmasının şematik gösterimi.)](Robot Kaynak Fikstür Elemanları Şeması)
`,
    [SECTIONS.DESIGN_GUIDELINES]: `
## Tasarımda Dikkat Edilecekler

Fikstür tasarımı sadece kinematik ve kuvvet dengesi değil, aynı zamanda operasyonel gerçekleri de hesaba katmalıdır.

### Operatör Ergonomisi
* **Yükleme/Boşaltma Kolaylığı:** Fikstür, parçaların doğal ve kolay bir şekilde yerleştirilip çıkarılmasını sağlamalıdır. Operatörün fazla eğilmesini veya uzanmasını gerektiren tasarımlardan kaçınılmalıdır (ideal çalışma yüksekliği ve erişim mesafeleri).
* **Görsel Denetim:** Operatörün kaynak dikişlerini ve parça konumunu kolayca görebilmesi için fikstür elemanları görüşü engellememelidir.

### Bakım Kolaylığı ve Güvenlik Standartları
* **Aşınma Parçaları:** Konumlandırma pinleri, çene yüzeyleri ve sıkıştırma pedleri gibi aşınacak elemanlar kolayca değiştirilebilir (bolt-on/changeable) olmalıdır.
* **Güvenlik:** Robotik hücrelerde, parça doğru konumlanmadığında robotun çalışmasını engelleyen sensörler (proximity sensors) zorunludur. Tüm pnömatik/hidrolik sistemler, acil durdurma (E-STOP) durumunda bile parçayı tutacak şekilde tasarlanmalıdır (self-locking mekanizmalar).

### Malzeme Seçimi ve Tolerans Analizi
* **Malzeme:** Kaynak fikstürlerinde termal kararlılık için genellikle ısıl işlem görmüş çelikler (örneğin AISI 1045, P20) veya yüksek rijitlik için alüminyum dökümler kullanılır. CNC fikstürlerinde sertleştirilmiş takım çelikleri (D2, A2) tercih edilir.
* **Tolerans Yığılması (Tolerance Stack-up):** Parça toleransı + fikstür imalat toleransı + makine tekrarlanabilirliği, nihai ürün toleransını belirler. Fikstür toleransı, genellikle parça toleransının %10-20'si kadar olmalıdır.

### Endüstriyel En İyi Uygulamalar
* **Poka-Yoke (Hata Önleme):** Fikstürün parçanın yanlış yerleştirilmesini fiziksel olarak imkansız kılan özellikleri olmalıdır (örneğin asimetrik pin yerleşimi).
* **Çip Yönetimi (CNC):** Talaşların kolayca düşmesini veya temizlenmesini sağlayan eğimli yüzeyler ve boşaltma kanalları tasarlanmalıdır.
`,
    [SECTIONS.CASE_STUDIES]: `
## Gerçek Örnekler (Case Studies)

### 1. Basit bir CNC İşleme Fikstürü: Flanş Kaynak Fikstürü
Bir flanşın deliklerini ve yüzeyini işlemek için tek bir fikstür.

* **Konumlandırma:** Flanşın merkez deliği, iki hassas yuvarlak pim (biri konik, diğeri eliptik) ile X ve Y'de konumlanır. Alt yüzey, üç destek noktası (3-2-1 kuralının 3'ü) ile Z rotasyonlarını kilitler.
* **Sıkıştırma:** Üstten tek bir pnömatik veya hidrolik silindir, merkezden aşağı doğru kuvvet uygular.
* **Teknik Not:** Pnömatik sıkıştırma kuvveti $500\ \text{N}$, en yüksek kesme kuvveti $F_{kesme}\ 120\ \text{N}$ ise, güvenlik faktörü $k=2.5$ için gerekli sıkma kuvveti $\mathbf{F}_{\mathbf{c}} \geq \mathbf{k} \cdot \mathbf{F}_{\mathbf{kesme}} / \mu$ olmalıdır. $\mu=0.25$ alınırsa, $F_c \geq 2.5 \cdot 120 / 0.25 = 1200\ \text{N}$ gerekir. Bu durumda tek bir pnömatik silindir yerine, sürtünmeyi artırmak için özel çeneler veya hidrolik silindir gerekir.

### 2. Karmaşık Robot Kaynak Fikstürü: Ağır Tank Gövdesi Tutucu
Büyük ve ağır bir şase parçasının robotla kaynaklanması.

* **Zorluk:** Parçanın ağırlığı, termal distorsiyon ve robot erişilebilirliği.
* **Tasarım Yaklaşımı:** Parça, kaynak pozisyoneri (turn table) üzerine monte edilir. Fikstürün kendisi pozisyoner üzerine monte edilir.
    * **Konumlandırma:** Parçanın 3 ana referans noktası (CNC işlenmiş bağlantı noktaları) 3 adet büyük, değiştirilebilir pin ile konumlanır.
    * **Sıkıştırma:** En az 10-15 noktada hidrolik sıkıştırma elemanları kullanılır. Kritik kaynak hatlarının yakınına, termal büzülmeyi önleyici kuvvet uygulayan sıkıştırıcılar yerleştirilir. Bu sıkıştırıcılar, kaynak tamamlandıktan sonra serbest bırakılır.
* **Robot Analizi:** Robot simülasyonunda, fikstürün çerçevesi ve sıkıştırma kolları, robot kolunun yörüngesini kısıtlamayacak şekilde tasarlanır. Torçun, fikstür elemanlarına çarpmadan tüm kaynak dikişlerine (özellikle iç köşelere) erişimi onaylanır.

### 3. Boru Kanalı Merkezleyici Aparat (Pallet Sistemi)
Makine içi palet değişim sistemine entegre boru merkezleme fikstürü.

* **Amaç:** Farklı çaplardaki boruların CNC tezgâhta alın ve kanal işlemesini yapmak.
* **Çene/Merkezleme Tasarımı:**
    * **V-Blok Prensibi:** Boruyu V şeklindeki yuvalara yerleştirmek, merkezlemeyi otomatik olarak sağlar.
    * **Hareketli Çeneler:** İki bağımsız hareket eden çene (jaws), borunun çapına göre otomatik olarak sıkıştırılır. Çenelerin iç yüzeyleri, borunun deformasyonunu önlemek için konturlu (yarıçaplı) veya özel poliüretan pedlerle kaplıdır.
* **Pallet Değişimi:** Fikstür, bir palet üzerine sabitlenir ve makineye otomatik olarak yüklenir. Palet üzerindeki hızlı bağlantı elemanları, hidrolik/pnömatik hatları ve elektrik sinyallerini otomatik bağlar.
`,
    [SECTIONS.DOCUMENTATION]: `
## Dokümantasyon & İndirilebilir Elkitabı Taslağı

Bu bölüm, elkitabının bir PDF/Word versiyonu olarak kullanılabilecek özetlenmiş, formatlanmış metnini içerir.

### Elkitabı İçeriği Özeti (PDF Formatı için)
* **Bölüm 1: Fikstür Temelleri**
    * Giriş, 6 DOF, 3-2-1 kuralının uygulamaları.
    * Hassasiyetin Tanımı: Mutlak Konumlandırma vs. Tekrar Konumlandırma.
* **Bölüm 2: CNC İşleme için Bağlama Prensipleri**
    * Sıkıştırma Kuvveti Güvenlik Faktörü Tablosu (Malzeme/İşlem Türüne Göre).
    * Çene Tipi Seçimi (Sert Çene, Yumuşak Çene, Kollet).
    * Talaş Yönetimi ve Soğutma Sıvısı Erişimi.
* **Bölüm 3: Robotik Sistemler ve Kaynak Fikstürleri**
    * Termal Distorsiyon Kontrol Yöntemleri (Sıkıştırma Sırası, Kaynak Sırası).
    * Fikstür Malzemelerinin Termal İletkenliği.
    * Pin Toleransları: Konik Pinler için $0.01\ \text{mm}$, Eliptik Pinler için $0.05\ \text{mm}$ serbestlik toleransı (örnek).
* **Bölüm 4: Tasarım ve Uygulama Kontrol Listesi**
    * **Poka-Yoke Kontrolü:** Yanlış yerleştirmeye karşı koruma sağlandı mı?
    * **Bakım Kontrolü:** Aşınan parçalar $15$ dakikada değiştirilebilir mi?
    * **Güvenlik Kontrolü:** Hidrolik basınç kaybında parça düşer mi?
* **Bölüm 5: Uygulama Örnekleri**
    * Flanş, Tank ve Boru fikstürlerinin detaylı CAD şemaları ve teknik çizim notları.

Bu metin, indirilebilir elkitabınızın temelini oluşturur. PDF formatına dönüştürmeden önce, tüm şemaları (CAD çizimleri) ve tabloları eklemeniz önerilir.
`,
};

// --- REACT COMPONENT ---

const App = () => {
    const [view, setView] = useState(SECTIONS.INTRO);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);

    // 1. Firebase/Auth Initialization (MANDATORY)
    useEffect(() => {
        if (!firebaseConfig) {
            console.error("Firebase config is missing.");
            return;
        }

        try {
            // initializeApp'i doğrudan firebase/app'ten import etmek için gerekli düzeltme yapıldı.
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Authentication state listener
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else if (initialAuthToken) {
                    // Sign in with custom token if available
                    await signInWithCustomToken(firebaseAuth, initialAuthToken).catch(e => {
                        console.error("Custom token sign-in failed, attempting anonymous.", e);
                        signInAnonymously(firebaseAuth).then(anonUser => setUserId(anonUser.user.uid)).catch(e2 => console.error("Anonymous sign-in failed:", e2));
                    });
                } else {
                    // Sign in anonymously as a fallback
                    await signInAnonymously(firebaseAuth).then(anonUser => setUserId(anonUser.user.uid)).catch(e => console.error("Anonymous sign-in failed:", e));
                }
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
        }
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const Sidebar = useCallback(() => (
        <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-gray-800 text-white p-4 shadow-xl z-20`}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-indigo-400">Tasarım Elkitabı</h1>
                <button onClick={toggleSidebar} className="lg:hidden text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>
            <nav className="space-y-2">
                {MENU_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => { setView(item.id); setIsSidebarOpen(false); }}
                        className={`flex items-center w-full py-2 px-3 rounded-lg transition duration-150 ${view === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    >
                        <item.icon size={18} className="mr-3" />
                        <span className="text-sm font-medium text-left">{item.id}</span>
                    </button>
                ))}
            </nav>
            <div className="mt-8 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500">Kullanıcı ID: <span className="text-yellow-400 break-all">{userId || 'Misafir'}</span></p>
            </div>
        </div>
    ), [view, isSidebarOpen, userId]);

    // Simplified Table of Contents (TOC) based on main headers
    const TOC = useCallback(() => {
        const content = CONTENT[view];
        if (!content) return null;

        const headers = content.split('\n').filter(line => line.startsWith('## ') || line.startsWith('### '));

        return (
            <div className="hidden lg:block w-64 p-4 sticky top-0 h-screen overflow-y-auto border-l border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-indigo-300 border-b border-gray-700 pb-2">İçindekiler</h3>
                <nav className="space-y-2">
                    {headers.map((header, index) => {
                        const isH2 = header.startsWith('## ');
                        const text = isH2 ? header.substring(3) : header.substring(4);
                        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '');
                        return (
                            <a
                                key={index}
                                href={`#${id}`}
                                className={`block text-sm transition-colors duration-150 ${isH2 ? 'font-medium text-gray-200' : 'text-gray-400 ml-4 hover:text-indigo-400'}`}
                            >
                                {text}
                            </a>
                        );
                    })}
                </nav>
            </div>
        );
    }, [view]);

    return (
        <div className="min-h-screen bg-gray-900 flex text-white">
            {/* Mobile Menu Button */}
            <button
                onClick={toggleSidebar}
                className="fixed top-4 left-4 z-30 lg:hidden p-2 bg-indigo-600 rounded-full shadow-lg hover:bg-indigo-700 transition"
            >
                <Menu size={24} />
            </button>

            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-x-hidden pt-16 lg:pt-0">
                <header className="sticky top-0 bg-gray-900/90 backdrop-blur-sm p-4 border-b border-gray-700 z-10 lg:pl-4 pl-20">
                    <h2 className="text-3xl font-extrabold text-white">{view}</h2>
                    <p className="text-sm text-indigo-400 mt-1">Üretim Mühendisliği En İyi Uygulamaları</p>
                </header>
                
                <main className="flex-1 flex">
                    <div className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto lg:mx-0">
                        <ContentRenderer content={CONTENT[view] || "İçerik yükleniyor veya bulunamadı."} />
                        {/* Placeholder for visual/CAD elements */}
                        <div className="mt-12 p-6 bg-gray-800 rounded-xl shadow-inner border border-indigo-700/50">
                            <h3 className="text-xl font-semibold text-indigo-400 mb-4 flex items-center">
                                <Globe size={20} className="mr-2"/> Görsel Anlatım / Şematik Gösterim
                            </h3>
                            <p className="text-gray-400">
                                Bu alan, elkitabındaki teknik bilgileri destekleyen CAD çizimleri benzeri basit wireframe şemalarını veya pozisyonlama noktası işaretlerini (Image of X etiketleri ile) içerecektir.
                            </p>
                            <div className="mt-4 p-4 bg-gray-700 rounded-lg text-sm font-mono text-green-300">
                                {/* Simple ASCII or description of a key concept */}
                                <pre className="whitespace-pre-wrap">
                                    {`
  // CNC Parça Bağlama Örneği (3-2-1 Kuralı)
       | Z-Yönü Sıkıştırma (Clamp)
  -----|-----
  | 3  | 2 | 1 (Konumlandırma noktaları)
  |____|___|
  
  Parça:
  [------]
  [------]
  [--|--|--] <-- 3 Nokta (Z'yi kilitler)
  
  [---]
  [---] <-- 2 Nokta (X ve Y Rotasyonu kilitler)
  [---]
  
  [|] <-- 1 Nokta (Son X veya Y Lineer hareketini kilitler)
                                `}
                                </pre>
                            </div>
                        </div>
                    </div>
                    {/* TOC Section */}
                    <TOC />
                </main>
            </div>
        </div>
    );
};

export default App;