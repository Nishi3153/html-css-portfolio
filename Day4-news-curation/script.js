// スプレッドシートのURL（実際のURLに置き換える必要があります）
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT-238rGgt7Qi_j9VTtjlpLvRUDB8ThBWICk8iDetwp9pRuXzDWeSfK11pFbDtM5NtTKfdvPufzv1JN/pub?output=csv';

// ページング用の状態管理
const categoryPagination = {
    bio: { currentPage: 1, totalPages: 1, articles: [] },
    space: { currentPage: 1, totalPages: 1, articles: [] },
    ai: { currentPage: 1, totalPages: 1, articles: [] },
    psycho: { currentPage: 1, totalPages: 1, articles: [] }
};

const ARTICLES_PER_PAGE = 20; // 1ページあたりの表示数

// 記事データを格納する配列
let articlesData = [];

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    loadArticles();
    setupCarousel();
});

// スプレッドシートから記事を読み込む
async function loadArticles() {
    try {
        // スプレッドシートからデータを取得
        const response = await fetch(SHEET_URL);
        const csvText = await response.text();
        console.log('CSVデータ:', csvText.substring(0, 500) + '...'); // 最初の500文字を表示
        
        articlesData = parseCSV(csvText);
        
        // デバッグ用：データが取得できない場合はダミーデータを使用
        if (articlesData.length === 0) {
            console.warn('スプレッドシートから有効なデータを取得できませんでした。ダミーデータを使用します。');
            articlesData = getDummyData();
        }
        
        displayLatestNews();
        displayCategoryNews();
        
    } catch (error) {
        console.error('記事の読み込みに失敗しました:', error);
        // フォールバック：ダミーデータを使用
        articlesData = getDummyData();
        displayLatestNews();
        displayCategoryNews();
    }
}

// 改善されたCSV解析（日付フォーマット対応強化）
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
            // 日付の正規化とバリデーション
            if (article.date) {
                try {
                    const testDate = new Date(article.date);
                    if (isNaN(testDate.getTime())) {
                        console.warn('無効な日付形式:', article.date, 'タイトル:', article.title);
                        // 無効な日付でもとりあえず保持
                    }
                } catch (error) {
                    console.warn('日付パースエラー:', article.date, error);
                }
            }
            
            // URLが正しく取得できているか詳細デバッグ
            if (articles.length < 5) {
                console.log(`記事${articles.length + 1}:`);
                console.log('  タイトル:', article.title);
                console.log('  日付:', article.date);
                console.log('  URL原文:', values[5]);
                console.log('  処理後URL:', article.url);
                console.log('  URLが有効:', article.url && article.url.startsWith('http'));
            }
            articles.push(article);
        }
    }
    
    console.log('取得した記事数:', articles.length);
    console.log('サンプルデータ:', articles[0]);
    
    return articles;
}

// 最新ニュースを表示（スプシ日付形式「2025/08/14」対応）
function displayLatestNews() {
    const carousel = document.getElementById('newsCarousel');
    
    // 日本時間で今日の日付を取得（複数形式で比較）
    const now = new Date();
    const japanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const todayISO = japanTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const todaySlash = todayISO.replace(/-/g, '/'); // YYYY/MM/DD
    
    console.log('今日の日付（ISO）:', todayISO);
    console.log('今日の日付（スラッシュ）:', todaySlash);
    
    // 今日取得したニュースをフィルタリング（複数の日付形式に対応）
    const todayArticles = articlesData.filter(article => {
        if (!article.date) return false;
        
        // 記事の日付を正規化（複数形式に対応）
        let articleDateString = '';
        
        try {
            // まず元の日付文字列をクリーンアップ
            let cleanDate = article.date.trim().replace(/^"|"$/g, '');
            
            // スプシ形式「2025/08/14」を直接比較
            if (cleanDate.includes('/')) {
                // スラッシュ形式の場合
                const dateParts = cleanDate.split('/');
                if (dateParts.length >= 3) {
                    // YYYY/MM/DD または YYYY/M/D 形式を正規化
                    const year = dateParts[0].padStart(4, '0');
                    const month = dateParts[1].padStart(2, '0');
                    const day = dateParts[2].split(' ')[0].padStart(2, '0'); // 時間部分を除去
                    articleDateString = `${year}/${month}/${day}`;
                }
            } else {
                // その他の形式はDateオブジェクトでパース
                const articleDate = new Date(cleanDate);
                if (!isNaN(articleDate.getTime())) {
                    const articleJapanTime = new Date(articleDate.getTime() + (9 * 60 * 60 * 1000));
                    articleDateString = articleJapanTime.toISOString().split('T')[0].replace(/-/g, '/');
                }
            }
        } catch (error) {
            console.warn('日付解析エラー:', article.date, error);
            return false;
        }
        
        // 今日の日付と比較（複数形式）
        const isToday = articleDateString === todaySlash || 
                       articleDateString === todayISO ||
                       articleDateString.replace(/\//g, '-') === todayISO;
        
        if (isToday) {
            console.log('今日のニュース発見:', article.title, '日付:', articleDateString);
        }
        
        return isToday;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // 新しい順
    
    console.log('今日のニュース件数:', todayArticles.length);
    
    if (todayArticles.length === 0) {
        // 今日のデータがない場合は、過去7日間の最新記事を表示
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentArticles = articlesData.filter(article => {
            const articleDate = new Date(article.date);
            return articleDate >= weekAgo;
        }).sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 20); // 最新20件
        
        carousel.innerHTML = recentArticles.map(article => createNewsCard(article)).join('');
        console.log('今日のデータなし。過去7日間の記事を表示:', recentArticles.length + '件');
        
        // ユーザーに通知（オプション）
        if (recentArticles.length > 0) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                background: rgba(255, 180, 71, 0.9);
                color: var(--dark-brown);
                padding: 0.5rem 1rem;
                border-radius: 10px;
                font-size: 0.85rem;
                margin-bottom: 1rem;
                text-align: center;
                border: 1px solid rgba(255, 212, 163, 0.5);
            `;
            notification.textContent = '今日のニュースはまだありません。過去7日間の最新記事を表示しています。';
            carousel.parentNode.insertBefore(notification, carousel);
        }
    } else {
        carousel.innerHTML = todayArticles.map(article => createNewsCard(article)).join('');
        console.log('今日のニュースを表示:', todayArticles.length + '件');
    }
}

// カテゴリ別ニュースを表示（ページング対応）
function displayCategoryNews() {
    const categories = {
        'bio': { elementId: 'bioArticles', name: 'バイオ・医学', infoId: 'bioPageInfo' },
        'space': { elementId: 'spaceArticles', name: '宇宙・地球科学', infoId: 'spacePageInfo' },
        'ai': { elementId: 'aiArticles', name: 'AI・テクノロジー', infoId: 'aiPageInfo' },
        'psycho': { elementId: 'psychoArticles', name: '心理・社会科学', infoId: 'psychoPageInfo' }
    };
    
    Object.entries(categories).forEach(([categoryKey, categoryInfo]) => {
        // カテゴリ別の全記事を取得（最大100件）
        const allCategoryArticles = articlesData.filter(article => 
            article.category && article.category.includes(categoryInfo.name.replace(/🤖|🌌|🧠|💡/g, '').trim())
        ).sort((a, b) => new Date(b.date) - new Date(a.date)) // 時系列順（新→旧）
          .slice(0, 100); // 最大100件
        
        // ページング情報を更新
        categoryPagination[categoryKey].articles = allCategoryArticles;
        categoryPagination[categoryKey].totalPages = Math.ceil(allCategoryArticles.length / ARTICLES_PER_PAGE);
        categoryPagination[categoryKey].currentPage = 1;
        
        // 現在のページの記事を表示
        displayCategoryPage(categoryKey, categoryInfo);
    });
}

// 特定カテゴリの指定ページを表示
function displayCategoryPage(categoryKey, categoryInfo) {
    const container = document.getElementById(categoryInfo.elementId);
    const pageInfo = document.getElementById(categoryInfo.infoId);
    const pagination = categoryPagination[categoryKey];
    
    // 現在のページの記事を取得
    const startIndex = (pagination.currentPage - 1) * ARTICLES_PER_PAGE;
    const endIndex = startIndex + ARTICLES_PER_PAGE;
    const pageArticles = pagination.articles.slice(startIndex, endIndex);
    
    // 記事を表示
    container.innerHTML = pageArticles.map(article => createArticleListItem(article)).join('');
    
    // ページ情報を更新
    pageInfo.textContent = `${pagination.currentPage} / ${pagination.totalPages}`;
    
    // ボタンの有効/無効を切り替え
    updatePaginationButtons(categoryKey);
}

// ページ切り替え関数
function changePage(categoryKey, direction) {
    const pagination = categoryPagination[categoryKey];
    const newPage = pagination.currentPage + direction;
    
    if (newPage >= 1 && newPage <= pagination.totalPages) {
        pagination.currentPage = newPage;
        
        const categories = {
            'bio': { elementId: 'bioArticles', name: 'バイオ・医学', infoId: 'bioPageInfo' },
            'space': { elementId: 'spaceArticles', name: '宇宙・地球科学', infoId: 'spacePageInfo' },
            'ai': { elementId: 'aiArticles', name: 'AI・テクノロジー', infoId: 'aiPageInfo' },
            'psycho': { elementId: 'psychoArticles', name: '心理・社会科学', infoId: 'psychoPageInfo' }
        };
        
        displayCategoryPage(categoryKey, categories[categoryKey]);
    }
}

// ページングボタンの状態を更新
function updatePaginationButtons(categoryKey) {
    const pagination = categoryPagination[categoryKey];
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        const categoryName = card.dataset.category;
        let targetKey = '';
        
        if (categoryName.includes('バイオ')) targetKey = 'bio';
        else if (categoryName.includes('宇宙')) targetKey = 'space';
        else if (categoryName.includes('AI')) targetKey = 'ai';
        else if (categoryName.includes('心理')) targetKey = 'psycho';
        
        if (targetKey === categoryKey) {
            const prevBtn = card.querySelector('.prev-btn');
            const nextBtn = card.querySelector('.next-btn');
            
            prevBtn.disabled = pagination.currentPage <= 1;
            nextBtn.disabled = pagination.currentPage >= pagination.totalPages;
        }
    });
}

// 最新ニュース用のカードHTMLを生成（横スクロール用、日付表示なし）
function createNewsCard(article) {
    return `
        <div class="news-card" onclick="openArticle('${article.url}')">
            <div class="news-card-category">${article.category || 'カテゴリ不明'}</div>
            <h5 class="news-card-title">${article.title}</h5>
            <p class="news-card-summary">${article.summary}</p>
            <div class="news-card-meta">
                <span class="news-card-source">${article.source}</span>
            </div>
        </div>
    `;
}

// カテゴリ別ニュース用のリストアイテムHTMLを生成
function createArticleListItem(article) {
    const formattedDate = formatDate(article.date);
    
    return `
        <div class="article-list-item" onclick="openArticle('${article.url}')" 
             onmouseenter="showTooltip(event, '${article.summary.replace(/'/g, "&#39;").replace(/"/g, "&quot;")}')" 
             onmouseleave="hideTooltip()"
             onmousemove="updateTooltipPosition(event)">
            <div class="article-list-meta">
                <span class="article-list-source">${article.source}</span>
                <span class="article-list-date">${formattedDate}</span>
            </div>
            <h6 class="article-list-title">${article.title}</h6>
        </div>
    `;
}

// 旧・記事カードのHTMLを生成（使用しない）
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

// 記事を開く（URL問題の一時対応含む）
function openArticle(url) {
    console.log('クリックされたURL:', url);
    
    if (url && url.startsWith('http')) {
        window.open(url, '_blank');
    } else {
        console.error('URLが無効です:', url);
        alert('申し訳ございません、この記事のリンクが無効です。\nスプレッドシートのURL設定を確認してください。');
    }
}

// ページトップにスムーズスクロール
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 横スクロール機能の設定
function setupCarousel() {
    const carousel = document.getElementById('newsCarousel');
    
    // マウスホイールで横スクロール
    carousel.addEventListener('wheel', function(e) {
        e.preventDefault();
        carousel.scrollLeft += e.deltaY;
    });
}

// ツールチップ表示関数
function showTooltip(event, summary) {
    // 既存のツールチップを削除
    hideTooltip();
    
    // 新しいツールチップを作成
    const tooltip = document.createElement('div');
    tooltip.className = 'article-tooltip active-tooltip';
    tooltip.innerHTML = summary;
    document.body.appendChild(tooltip);
    
    // 初期位置を設定
    updateTooltipPosition(event);
    
    // アニメーションで表示
    setTimeout(() => {
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
    }, 10);
}

// ツールチップ位置更新関数
function updateTooltipPosition(event) {
    const tooltip = document.querySelector('.active-tooltip');
    if (!tooltip) return;
    
    // マウス位置を取得
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    
    // カテゴリカードの位置を取得
    const categoryCard = event.target.closest('.category-card');
    if (!categoryCard) return;
    
    const cardRect = categoryCard.getBoundingClientRect();
    
    // ツールチップの位置を計算（カードの上部に表示）
    let left = mouseX - 200; // ツールチップの幅の半分
    let top = cardRect.top - 20; // カードの上に表示
    
    // 画面端からはみ出さないよう調整
    if (left < 10) left = 10;
    if (left + 400 > window.innerWidth) left = window.innerWidth - 410;
    if (top < 10) top = cardRect.bottom + 10; // 上にスペースがない場合は下に
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

// ツールチップ非表示関数
function hideTooltip() {
    const existingTooltip = document.querySelector('.active-tooltip');
    if (existingTooltip) {
        existingTooltip.style.opacity = '0';
        existingTooltip.style.visibility = 'hidden';
        setTimeout(() => {
            if (existingTooltip.parentNode) {
                existingTooltip.parentNode.removeChild(existingTooltip);
            }
        }, 300);
    }
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

// 日付比較のヘルパー関数（デバッグ用）
function compareDates(date1, date2) {
    const d1 = new Date(date1).toISOString().split('T')[0];
    const d2 = new Date(date2).toISOString().split('T')[0];
    console.log('日付比較:', d1, 'vs', d2, '結果:', d1 === d2);
    return d1 === d2;
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