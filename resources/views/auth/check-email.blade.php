@extends('layouts.app')
@section('title', 'Check your email')
@push('head')<link rel="stylesheet" href="/css/auth.css">@endpush
@section('content')
<section class="au-card" aria-labelledby="au-t">
  <div class="au-icon" aria-hidden="true">✉️</div>
  <h1 id="au-t">Check your email</h1>
  <p class="au-lead">
    @if ($email)
      We sent a sign-in link to <strong>{{ $email }}</strong>.
    @else
      We sent a sign-in link to your inbox.
    @endif
    It works once and expires in {{ \App\Models\LoginToken::TTL_MINUTES }} minutes.
  </p>
  <p class="au-note">Nothing there? Check spam, or <a href="{{ route('login') }}">send another link</a>.</p>
</section>
@endsection
