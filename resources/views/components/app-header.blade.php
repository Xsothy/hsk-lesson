@php
// Canvas "AppHeader": four menus, each item = tinted glyph square + title + sub. Group tint follows the menu.
$groups = [
  'learn' => ['Learn', [
    ['首', 'Home', 'Today, your course, HSK path', route('home'), 'home'],
    ['程', 'Courses', 'Our course, HSK 2.0, HSK 3.0, textbooks', route('courses'), 'courses'],
    ['课', 'Lessons', '12 lessons with grammar & dialogue', route('lesson', 'lesson-1'), 'lesson'],
    ['读', 'Readings', 'Stories with questions', route('reading', ['lesson-1', 1]), 'reading'],
    ['指', 'Guides', 'Strokes, tones, look-alikes', route('guides'), 'guides'],
  ], ['home', 'courses', 'lesson', 'reading', 'guides', 'guide']],
  'chars' => ['Characters', [
    ['字', 'Character pages', 'Strokes, meaning, words', route('char', '学'), 'char'],
    ['部', 'Character parts', 'Meaning & sound clues', route('parts'), 'parts'],
    ['词', 'HSK & Dictionary', 'HSK 2.0 / 3.0, pinyin, radicals', route('browse'), 'browse'],
    ['搜', 'Search', 'Hanzi, pinyin or English', route('search'), 'search'],
  ], ['char', 'char.legacy', 'parts', 'browse', 'search']],
  'practice' => ['Practice', [
    ['写', 'Write & dictation', 'Stroke-by-stroke feedback', route('practice'), 'practice'],
    ['复', 'Flashcards', 'Spaced-repetition review', route('review'), 'review'],
    ['对', 'Pinyin match', 'Quick matching game', route('practice.match'), 'practice.match'],
    ['印', 'Worksheets', 'Printable practice sheets', route('worksheet'), 'worksheet'],
  ], ['practice', 'practice.*', 'review', 'worksheet']],
  'more' => ['More', [
    ['我', 'My words', 'Saved words & progress', route('words'), 'words'],
    ['工', 'Tools', 'Pinyin converter, HSK checker', route('tools'), 'tools'],
    ['设', 'Settings', 'Display, audio, sync', route('settings'), 'settings'],
  ], ['words', 'tools', 'tools.*', 'settings', 'appearance', 'account', 'login', 'register']],
];
$search = '<svg width="%1$d" height="%1$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>';
$sliders = '<svg width="%1$d" height="%1$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
@endphp
<header class="hdr">
  <div class="hdr-row">
    <a class="logo" href="{{ route('home') }}" lang="zh-Hans">汉字<span>课堂</span></a>
    <nav class="menus" aria-label="Main">
      @foreach ($groups as $key => [$label, $items, $active])
        <div class="menu menu-{{ $key }}@if(request()->routeIs(...$active)) is-current @endif">
          <button type="button" class="menu-btn" aria-expanded="false" aria-haspopup="true">{{ $label }}<svg class="menu-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="menu-list">
            @foreach ($items as [$glyph, $title, $sub, $href, $route])
              <a href="{{ $href }}" @if($route && request()->routeIs($route)) aria-current="page" @endif>
                <span class="mi-glyph" lang="zh-Hans" aria-hidden="true">{{ $glyph }}</span>
                <span class="mi-text"><b>{{ $title }}</b><span>{{ $sub }}</span></span>
              </a>
            @endforeach
          </div>
        </div>
      @endforeach
    </nav>
    <a class="icon-btn hdr-search-btn" href="{{ route('search') }}" aria-label="Search"><span class="ib-d">{!! sprintf($search, 20) !!}</span><span class="ib-m">{!! sprintf($search, 22) !!}</span></a>
    <form class="hdr-search" action="{{ route('search') }}" method="get" role="search">
      {!! sprintf($search, 18) !!}
      <input type="search" name="q" aria-label="Search" placeholder="Search 学, xue, study…" value="{{ request()->routeIs('search') ? request('q') : '' }}">
    </form>
    <a class="icon-btn settings" href="{{ route('settings') }}" aria-label="Settings" @if(request()->routeIs('settings')) aria-current="page" @endif><span class="ib-d">{!! sprintf($sliders, 20) !!}</span><span class="ib-m">{!! sprintf($sliders, 22) !!}</span></a>
    @auth
      <a class="icon-btn account is-signed-in" href="{{ route('account') }}" aria-label="Account (signed in)" @if(request()->routeIs('account')) aria-current="page" @endif><x-icon name="user" :size="20" /></a>
    @else
      <a class="icon-btn account" href="{{ route('login') }}" aria-label="Sign in" @if(request()->routeIs('login')) aria-current="page" @endif><x-icon name="user" :size="20" /></a>
    @endauth
  </div>
</header>
