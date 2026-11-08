<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@yield('title', '汉字课堂') · 汉字课堂</title>
<script src="/js/apply-settings.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Noto+Serif+SC:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/app.css">
<link rel="stylesheet" href="/css/components.css">
@stack('head')
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<x-app-header />
<main id="main" class="page">@yield('content')</main>
<x-tab-bar />
<script src="/js/audio-service.js"></script>
<script src="/js/chrome.js"></script>
@stack('scripts')
</body>
</html>
