@php
$tabs = [
  ['Learn','home','📖',['home','courses','lesson','reading']],
  ['Practice','practice','✍️',['practice']],
  ['Review','review','🔁',['review']],
  ['Browse','browse','🔤',['browse','search','char']],
];
@endphp
<nav class="tabbar" aria-label="Tabs">
  @foreach ($tabs as [$label, $name, $icon, $active])
    <a href="{{ route($name) }}" @if(request()->routeIs($active)) aria-current="page" @endif><span aria-hidden="true">{{ $icon }}</span>{{ $label }}</a>
  @endforeach
</nav>
