// スプレッドシートのURL（実際のURLに置き換える必要があります）
const SHEET_URL = 'hhttps://docs.google.com/spreadsheets/d/e/2PACX-1vT-238rGgt7Qi_j9VTtjlpLvRUDB8ThBWICk8iDetwp9pRuXzDWeSfK11pFbDtM5NtTKfdvPufzv1JN/pubhtml';

// 記事データを格納する配列
let articlesData = [];

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    loadArticles();
    setupCarousel();
});

// 一時的にスプレッドシートから手動でデータを取得してテスト
async function loadArticles() {
    try {
        // 実際のデータをハードコーディング（一時的）
        const actualData = `
2025-08-15 10:30,Science Daily,Quantum Computing Breakthrough,量子コンピューティングの画期的進展により暗号化技術が革命,研究チームが開発した新しい量子暗号化プロトコルは従来より1000倍高い安全性を提供し金融機関での実用化が期待される,https://example.com/quantum,AI・テクノロジー
2025-08-14 14:20,AI新聞,Mars Underground Discovery,火星地下で生命の痕跡発見,NASAの探査機が火星地下で生命活動の可能性を示す有機化合物を検出し宇宙生物学に大きな影響,https://example.com/mars,宇宙・地球科学
2025-08-13 09:15,Ars Technica,Gene Therapy Success,遺伝子治療で失明患者の視力回復,CRISPR-Cas9技術により先天性失明症患者の70%が視力回復し他の遺伝性疾患への応用も期待,https://example.com/gene,バイオ・医学
2025-08-12 16:45,Science Daily,AI Emotion Recognition,AIが人間感情をより正確に理解,機械学習の進歩でAIが人間の感情変化を98%の精度で検出しメンタルヘルス分野での活用に期待,https://example.com/emotion,心理・社会科学
`;
        
        articlesData = parseCSV(actualData.trim());
        
        displayLatestNews();
        displayCategoryNews();
        
        console.log('手動データでテスト中 - 記事数:', articlesData.length);
        
    } catch (error) {
        console.error('記事の読み込みに失敗しました:', error);
        // フォールバック：ダミーデータを使用
        articlesData = getDummyData();
        displayLatestNews();
        displayCategoryNews();
    }
}

// CSV文字列を解析して配列に変換（ヘッダーなし版）
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const articles = [];
    
    // スプレッドシートの列構造
    // A列: 日時, B列: ソース, C列: タイトル, D列: 和訳タイトル, E列: AI解説, F列: 記事リンク, G列: カテゴリ
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',');
        if (values.length < 7) continue; // 7列未満のデータはスキップ
        
        const article = {
            date: values[0] ? values[0].trim().replace(/^"|"$/g, '') : '',
            source: values[1] ? values[1].trim().replace(/^"|"$/g, '') : '',
            originalTitle: values[2] ? values[2].trim().replace(/^"|"$/g, '') : '',
            title: values[3] ? values[3].trim().replace(/^"|"$/g, '') : '', // 和訳タイトルを使用
            summary: values[4] ? values[4].trim().replace(/^"|"$/g, '') : '',
            url: values[5] ? values[5].trim().replace(/^"|"$/g, '') : '',
            category: values[6] ? values[6].trim().replace(/^"|"$/g, '') : ''
        };
        
        // データが有効かチェック（タイトルと要約があれば有効）
        if (article.title && article.summary) {
            articles.push(article);
        }
    }
    
    console.log('取得した記事数:', articles.length);
    console.log('サンプルデータ:', articles[0]);
    
    return articles;
}

// 最新ニュースを表示
function displayLatestNews() {
    const carousel = document.getElementById('newsCarousel');
    const latestArticles = articlesData.slice(0, 10); // 最新10件
    
    carousel.innerHTML = latestArticles.map(article => createArticleCard(article)).join('');
}

// カテゴリ別ニュースを表示
function displayCategoryNews() {
    const categories = {
        'bioArticles': 'バイオ・医学',
        'spaceArticles': '宇宙・地球科学',
        'aiArticles': 'AI・テクノロジー',
        'psychoArticles': '心理・社会科学'
    };
    
    Object.entries(categories).forEach(([elementId, categoryName]) => {
        const container = document.getElementById(elementId);
        const categoryArticles = articlesData.filter(article => 
            article.category && article.category.includes(categoryName.replace(/🤖|🌌|🧠|💡/g, '').trim())
        ).slice(0, 5); // 各カテゴリ5件まで
        
        container.innerHTML = categoryArticles.map(article => createArticleCard(article)).join('');
    });
}

// 記事カードのHTMLを生成
function createArticleCard(article) {
    const formattedDate = formatDate(article.date);
    
    return `
        <div class="article-card" onclick="openArticle('${article.url}')">
            <h5 class="article-title">${article.title}</h5>
            <p class="article-summary">${article.summary}</p>
            <div class="article-meta">
                <span class="article-source">${article.source}</span>
                <span class="article-date">${formattedDate}</span>
            </div>
        </div>
    `;
}

// 日付をフォーマット
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '昨日';
    if (diffDays < 7) return `${diffDays}日前`;
    
    return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric'
    });
}

// 記事を開く
function openArticle(url) {
    if (url && url !== '') {
        window.open(url, '_blank');
    }
}

// カルーセル機能の設定
function setupCarousel() {
    const carousel = document.getElementById('newsCarousel');
    let isScrolling = false;
    
    // スムーズスクロール
    carousel.addEventListener('wheel', function(e) {
        e.preventDefault();
        carousel.scrollTop += e.deltaY;
    });
}

// エラーメッセージを表示
function displayErrorMessage() {
    const carousel = document.getElementById('newsCarousel');
    carousel.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--dark-brown); opacity: 0.6;">
            <p>記事の読み込み中にエラーが発生しました。</p>
            <p>しばらく時間をおいてから再度お試しください。</p>
        </div>
    `;
}

// デモ用ダミーデータ
function getDummyData() {
    return [
        {
            title: "新しい量子コンピューティング技術により、暗号化の安全性が向上",
            summary: "研究者チームが開発した新しい量子暗号化プロトコルは、従来の方法よりも1000倍高い安全性を提供します。この技術は金融機関での実用化が期待されています。",
            source: "Science Daily",
            category: "AI・テクノロジー",
            date: "2025-08-15",
            url: "https://example.com/article1"
        },
        {
            title: "火星の地下で新たな生命の痕跡を発見",
            summary: "NASAの探査機が火星の地下深くで、生命活動を示す可能性のある有機化合物を検出しました。この発見は宇宙生物学の分野に大きな影響を与えると予想されます。",
            source: "AI新聞",
            category: "宇宙・地球科学",
            date: "2025-08-14",
            url: "https://example.com/article2"
        },
        {
            title: "遺伝子治療により失明患者の視力が回復",
            summary: "新しい遺伝子編集技術CRISPR-Cas9を使用した臨床試験で、先天性失明症患者の70%が視力を回復しました。この画期的な治療法は他の遺伝性疾患にも応用可能です。",
            source: "Ars Technica",
            category: "バイオ・医学",
            date: "2025-08-13",
            url: "https://example.com/article3"
        },
        {
            title: "AIが人間の感情をより正確に理解できる新技術",
            summary: "機械学習アルゴリズムの進歩により、AIシステムが人間の微細な感情変化を98%の精度で検出できるようになりました。この技術はメンタルヘルス分野での活用が期待されています。",
            source: "Science Daily",
            category: "心理・社会科学",
            date: "2025-08-12",
            url: "https://example.com/article4"
        },
        {
            title: "超高速充電バッテリーの実用化に成功",
            summary: "新しいナノマテリアル技術により、従来の10倍の速度で充電可能なリチウムイオンバッテリーの実用化に成功しました。この技術により電気自動車の普及が加速すると予想されます。",
            source: "AI新聞",
            category: "AI・テクノロジー",
            date: "2025-08-11",
            url: "https://example.com/article5"
        }
    ];
}