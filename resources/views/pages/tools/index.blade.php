@extends('layouts.app')
@section('title', 'Tools')
@push('head')<link rel="stylesheet" href="/css/tools.css">@endpush
@section('content')
<h1>Tools</h1>
<p class="muted">Small helpers for learners.</p>
<div class="tools-grid">
  @foreach ($tools as [$icon, $title, $sub, $route])
    <x-action-row :icon="$icon" :title="$title" :sub="$sub" :href="route($route)" />
  @endforeach
</div>
@endsection
