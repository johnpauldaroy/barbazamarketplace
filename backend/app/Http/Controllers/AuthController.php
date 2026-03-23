<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['Invalid login credentials.'],
            ]);
        }

        $storedPassword = (string) $user->password;
        $valid = false;

        try {
            $valid = Hash::check($request->password, $storedPassword);
        } catch (\Throwable $e) {
            if (str_starts_with($storedPassword, '$')) {
                $valid = password_verify($request->password, $storedPassword);
            } else {
                $valid = hash_equals($storedPassword, (string) $request->password);
            }
        }

        if (!$valid) {
            throw ValidationException::withMessages([
                'email' => ['Invalid login credentials.'],
            ]);
        }

        try {
            if (Hash::needsRehash($storedPassword)) {
                $user->password = Hash::make($request->password);
                $user->save();
            }
        } catch (\Throwable $e) {
            $user->password = Hash::make($request->password);
            $user->save();
        }

        Auth::login($user);
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $payload = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $storedPassword = (string) $user->password;
        $valid = false;

        try {
            $valid = Hash::check($payload['current_password'], $storedPassword);
        } catch (\Throwable $e) {
            if (str_starts_with($storedPassword, '$')) {
                $valid = password_verify($payload['current_password'], $storedPassword);
            } else {
                $valid = hash_equals($storedPassword, (string) $payload['current_password']);
            }
        }

        if (!$valid) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->password = Hash::make($payload['password']);
        $user->save();

        return response()->json([
            'message' => 'Password updated successfully',
        ]);
    }
}
