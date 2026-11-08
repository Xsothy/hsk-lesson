@extends('layouts.app')
@section('title', 'Create account')
@push('head')<link rel="stylesheet" href="/css/auth.css">@endpush
@section('content')
<section class="au-card" aria-labelledby="au-t">
  <h1 id="au-t">Create account</h1>
  <p class="au-lead">Free. Your progress on this device stays as it is.</p>

  <form method="POST" action="{{ route('register') }}" class="au-form" novalidate>
    @csrf
    <label for="au-name">Name</label>
    <input id="au-name" name="name" type="text" autocomplete="name" required maxlength="100" value="{{ old('name') }}">
    @error('name')<p class="au-err" role="alert">{{ $message }}</p>@enderror

    <label for="au-email">Email</label>
    <input id="au-email" name="email" type="email" autocomplete="email" inputmode="email" required value="{{ old('email') }}">
    @error('email')<p class="au-err" role="alert">{{ $message }}</p>@enderror

    <label for="au-password">Password</label>
    <input id="au-password" name="password" type="password" autocomplete="new-password" required minlength="8" aria-describedby="au-pw-hint">
    <p class="au-hint" id="au-pw-hint">At least 8 characters.</p>
    @error('password')<p class="au-err" role="alert">{{ $message }}</p>@enderror

    <label for="au-password2">Confirm password</label>
    <input id="au-password2" name="password_confirmation" type="password" autocomplete="new-password" required>

    <label class="au-check"><input type="checkbox" name="remember" value="1" checked> Keep me signed in</label>
    <button type="submit" class="au-btn au-primary">Create account</button>
  </form>
  <p class="au-note">Already have an account? <a href="{{ route('login') }}">Sign in</a>.</p>
</section>
@endsection
