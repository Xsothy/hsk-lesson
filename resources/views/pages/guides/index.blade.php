@extends('layouts.app')
@section('title', 'Guides')
@push('head')<link rel="stylesheet" href="/css/guides.css">@endpush
@section('content')
<x-page-head eyebrow="Learn" title="Guides" zh="语法小贴士" sub="Short explainers for the mix-ups learners meet most." />
<div class="chips guide-filters" aria-label="Filter guides">
  <x-chip :href="route('guides')" :active="$level === '' && $tag === ''">All</x-chip>
  @foreach ($levels as $l)
    <x-chip :href="route('guides', ['level' => $l])" :active="$level === $l">{{ ucfirst($l) }}</x-chip>
  @endforeach
  @foreach ($tags as $t)
    <x-chip :href="route('guides', ['tag' => $t])" :active="$tag === $t">#{{ $t }}</x-chip>
  @endforeach
</div>
<div class="guide-list">
  @forelse ($list as $g)
    <a class="guide-card" href="{{ route('guide', $g['slug']) }}">
      <span class="eyebrow">{{ ucfirst($g['level']) }}</span>
      <strong>{{ $g['title'] }}</strong>
      <span class="muted">{{ $g['summary'] }}</span>
    </a>
  @empty
    <p class="muted">No guides match that filter.</p>
  @endforelse
</div>
@endsection
