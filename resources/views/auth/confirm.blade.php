@extends('layouts.app')
@section('title', 'Sign in')
@push('head')<link rel="stylesheet" href="/css/auth.css">@endpush
@section('content')
<section class="au-card" aria-labelledby="au-t">
  <h1 id="au-t">Finish signing in</h1>
  <p class="au-lead">Tap the button to sign in on this device.</p>
  <form method="POST" action="{{ $action }}" class="au-form">
    @csrf
    <button type="submit" class="au-btn au-primary" id="au-confirm">Sign in</button>
  </form>
</section>
@endsection
