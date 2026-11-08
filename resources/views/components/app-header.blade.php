@php
$groups = [
  'Learn' => [['Home','home'],['Courses','courses']],
  'Characters' => [['Browse','browse'],['Search','search']],
  'Practice' => [['Practice','practice'],['Review','review']],
  'More' => [['My words','words'],['Tools','tools'],['Settings','settings']],
];
@endphp
<header class="hdr">
  <a class="logo" href="{{ route('home') }}">汉字课堂</a>
  <nav class="menus" aria-label="Main">
    @foreach ($groups as $label => $items)
      <div class="menu">
        <button type="button" class="menu-btn" aria-expanded="false" aria-haspopup="true">{{ $label }} ▾</button>
        <div class="menu-list">
          @foreach ($items as [$text, $name])
            <a href="{{ route($name) }}" @if(request()->routeIs($name)) aria-current="page" @endif>{{ $text }}</a>
          @endforeach
        </div>
      </div>
    @endforeach
  </nav>
  <div class="hdr-actions">
    <a class="icon-btn" href="{{ route('search') }}" aria-label="Search">🔍</a>
    <a class="icon-btn settings" href="{{ route('settings') }}" aria-label="Settings">⚙️</a>
    @auth
      <a class="icon-btn account is-signed-in" href="{{ route('account') }}" aria-label="Account (signed in)" @if(request()->routeIs('account')) aria-current="page" @endif>👤</a>
    @else
      <a class="icon-btn account" href="{{ route('login') }}" aria-label="Sign in" @if(request()->routeIs('login')) aria-current="page" @endif>👤</a>
    @endauth
  </div>
</header>
