// ═══════════════════════════════════════════════════════════════
// ⚙️ Service Worker — إلكترونك
// ═══════════════════════════════════════════════════════════════

var CACHE_VERSION = 'electronic-v5';  // 👈 غيّرها عند كل تحديث مهم
var STATIC_CACHE = CACHE_VERSION + '-static';
var RUNTIME_CACHE = CACHE_VERSION + '-runtime';

// الملفات الأساسية التي يجب تخزينها
var PRECACHE_URLS = [
    './',
    './index.html',
    './dashboard.html',
    './db-config.js',
    './manifest.json',
    './logo.png',
    './offline.html'
];

// ═══════════════════════════════════════════════════════════════
// 📦 Install
// ═══════════════════════════════════════════════════════════════
self.addEventListener('install', function(event) {
    console.log('⚙️ SW installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(function(cache) {
                // استخدم addAll مع تجاهل الأخطاء للملفات غير الموجودة
                return Promise.allSettled(
                    PRECACHE_URLS.map(function(url) {
                        return cache.add(url).catch(function(err) {
                            console.warn('⚠️ فشل تخزين:', url, err.message);
                        });
                    })
                );
            })
            .then(function() {
                console.log('✅ SW installed');
                return self.skipWaiting();
            })
    );
});

// ═══════════════════════════════════════════════════════════════
// 🔄 Activate — نظّف الكاشات القديمة
// ═══════════════════════════════════════════════════════════════
self.addEventListener('activate', function(event) {
    console.log('⚙️ SW activating...');
    event.waitUntil(
        caches.keys()
            .then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(name) {
                        if (name !== STATIC_CACHE && name !== RUNTIME_CACHE) {
                            console.log('🗑️ حذف كاش قديم:', name);
                            return caches.delete(name);
                        }
                    })
                );
            })
            .then(function() {
                console.log('✅ SW activated');
                return self.clients.claim();
            })
    );
});

// ═══════════════════════════════════════════════════════════════
// 🌐 Fetch — استراتيجية ذكية
// ═══════════════════════════════════════════════════════════════
self.addEventListener('fetch', function(event) {
    var request = event.request;
    
    // تجاهل الطلبات غير GET
    if (request.method !== 'GET') return;
    
    // تجاهل طلبات Supabase و APIs الخارجية
    var url = new URL(request.url);
    if (url.hostname.includes('supabase.co') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com')) {
        return;
    }
    
    // تجاهل chrome-extension وغيرها
    if (!url.protocol.startsWith('http')) return;
    
    // HTML pages → Network First
    if (request.mode === 'navigate' || 
        (request.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(networkFirstHtml(request));
        return;
    }
    
    // Static assets → Cache First
    event.respondWith(cacheFirst(request));
});

// ═══════════════════════════════════════════════════════════════
// 📡 استراتيجيات
// ═══════════════════════════════════════════════════════════════
function networkFirstHtml(request) {
    return fetch(request)
        .then(function(response) {
            // خزّن نسخة محدثة
            if (response && response.status === 200) {
                var responseClone = response.clone();
                caches.open(RUNTIME_CACHE).then(function(cache) {
                    cache.put(request, responseClone);
                });
            }
            return response;
        })
        .catch(function() {
            // Offline → ارجع من الكاش أو صفحة offline
            return caches.match(request).then(function(cached) {
                return cached || caches.match('./offline.html') || 
                       caches.match('./index.html');
            });
        });
}

function cacheFirst(request) {
    return caches.match(request)
        .then(function(cached) {
            if (cached) return cached;
            
            return fetch(request).then(function(response) {
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                
                var responseClone = response.clone();
                caches.open(RUNTIME_CACHE).then(function(cache) {
                    cache.put(request, responseClone);
                });
                
                return response;
            });
        })
        .catch(function() {
            // لو مش موجود في الكاش وفشل الاتصال
            return new Response('Offline', { 
                status: 503, 
                statusText: 'Service Unavailable' 
            });
        });
}

// ═══════════════════════════════════════════════════════════════
// 💬 Message — للتحكم من الصفحة
// ═══════════════════════════════════════════════════════════════
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(function(names) {
            return Promise.all(names.map(function(name) {
                return caches.delete(name);
            }));
        });
    }
});

console.log('⚙️ Service Worker loaded');
