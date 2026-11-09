@php
// Canvas "TabBar": same four groups as the header menus. The canvas hides it at every width
// (".tb-nav{display:none}": the header menus cover phones too), so it stays in the markup but is not shown.
$tabs = [
  ['Learn','home','lesson',['home','courses','lesson','reading','guides','guide']],
  ['Characters','browse','search',['browse','search','char']],
  ['Practice','practice','pencil',['practice','practice.*','review','worksheet']],
  ['More','words','more',['words','tools','tools.*','settings','appearance']],
];
@endphp
<nav class="tabbar" aria-label="Tabs">
  @foreach ($tabs as [$label, $name, $icon, $active])
    <a href="{{ route($name) }}" @if(request()->routeIs(...$active)) aria-current="page" @endif><span class="tb-pill"><x-icon :name="$icon" /></span>{{ $label }}</a>
  @endforeach
</nav>
