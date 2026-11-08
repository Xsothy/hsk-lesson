@php
$tabs = [
  ['Learn','home','book',['home','courses','lesson','reading']],
  ['Practice','practice','pen',['practice']],
  ['Review','review','repeat',['review']],
  ['Browse','browse','hanzi',['browse','search','char']],
];
@endphp
<nav class="tabbar" aria-label="Tabs">
  @foreach ($tabs as [$label, $name, $icon, $active])
    <a href="{{ route($name) }}" @if(request()->routeIs($active)) aria-current="page" @endif><x-icon :name="$icon" />{{ $label }}</a>
  @endforeach
</nav>
