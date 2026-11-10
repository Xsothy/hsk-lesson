@php
// Main nav: three short groups + a direct link. One markup, two layouts (app.css):
// header dropdowns from 761px up, a fixed bottom tab bar with pop-up sheets on phones.
// Search, Settings and Account are the icons on the right, so they are not repeated in the menus.
$groups = [
  'learn' => ['Learn', 'home', [
    ['首', 'Home', route('home'), 'home'],
    ['程', 'Courses', route('courses'), 'courses'],
    ['指', 'Guides', route('guides'), ['guides', 'guide']],
  ], ['home', 'courses', 'lesson', 'reading', 'guides', 'guide']],
  'practice' => ['Practice', 'cards', [
    ['卡', 'Flashcards', route('review'), 'review'],
    ['写', 'Write & dictation', route('practice'), 'practice'],
    ['句', 'Sentences', route('practice.sentences'), 'practice.sentences'],
    ['对', 'Pinyin match', route('practice.match'), 'practice.match'],
    ['印', 'Worksheets', route('worksheet'), 'worksheet'],
  ], ['practice', 'practice.*', 'review', 'worksheet']],
  'dict' => ['Dictionary', 'search', [
    ['词', 'HSK word lists', route('browse'), 'browse'],
    ['部', 'Character parts', route('parts'), 'parts'],
    ['工', 'Tools', route('tools'), ['tools', 'tools.*']],
  ], ['browse', 'search', 'char', 'char.legacy', 'parts', 'tools', 'tools.*']],
];
$search = '<svg width="%1$d" height="%1$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>';
$sliders = '<svg width="%1$d" height="%1$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
@endphp
<header class="hdr">
  <div class="hdr-row">
    <a class="logo" href="{{ route('home') }}" lang="zh-Hans">汉字<span>课堂</span></a>
    <nav class="menus" aria-label="Main">
      @foreach ($groups as $key => [$label, $icon, $items, $active])
        <div class="menu menu-{{ $key }}@if(request()->routeIs(...$active)) is-current @endif">
          <button type="button" class="menu-btn" aria-expanded="false" aria-haspopup="true"><span class="menu-ico"><x-icon :name="$icon" :size="22" /></span><span class="menu-label">{{ $label }}</span><svg class="menu-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="menu-list">
            @foreach ($items as [$glyph, $title, $href, $route])
              <a href="{{ $href }}" @if(request()->routeIs(...(array) $route)) aria-current="page" @endif>
                <span class="mi-glyph" lang="zh-Hans" aria-hidden="true">{{ $glyph }}</span>
                <b>{{ $title }}</b>
              </a>
            @endforeach
          </div>
        </div>
      @endforeach
      <a class="menu-btn menu-link {{ request()->routeIs('words') ? 'is-current' : '' }}" href="{{ route('words') }}" @if(request()->routeIs('words')) aria-current="page" @endif><span class="menu-ico"><x-icon name="bookmark" :size="22" /></span><span class="menu-label">My words</span></a>
    </nav>
    <a class="icon-btn hdr-search-btn" href="{{ route('search') }}" aria-label="Search"><span class="ib-d">{!! sprintf($search, 20) !!}</span><span class="ib-m">{!! sprintf($search, 22) !!}</span></a>
    <form class="hdr-search" action="{{ route('search') }}" method="get" role="search">
      {!! sprintf($search, 18) !!}
      <input type="search" name="q" aria-label="Search" placeholder="Search 学, xue, study…" value="{{ request()->routeIs('search') ? request('q') : '' }}">
    </form>
    <a class="icon-btn settings" href="{{ route('settings') }}" aria-label="Settings" @if(request()->routeIs('settings', 'appearance')) aria-current="page" @endif><span class="ib-d">{!! sprintf($sliders, 20) !!}</span><span class="ib-m">{!! sprintf($sliders, 22) !!}</span></a>
    @auth
      <a class="icon-btn account is-signed-in" href="{{ route('account') }}" aria-label="Account (signed in)" @if(request()->routeIs('account')) aria-current="page" @endif><x-icon name="user" :size="20" /></a>
    @else
      <a class="icon-btn account" href="{{ route('login') }}" aria-label="Sign in" @if(request()->routeIs('login')) aria-current="page" @endif><x-icon name="user" :size="20" /></a>
    @endauth
  </div>
</header>
