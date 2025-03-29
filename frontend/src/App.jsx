import { AuthClient } from '@dfinity/auth-client';
import { createActor } from 'declarations/backend';
import { canisterId } from 'declarations/backend/index.js';
import React, { useState, useEffect } from 'react';
import '../index.css';
// import PostItem from "./Component_PostDataCard";

const network = process.env.DFX_NETWORK;
const identityProvider =
    network === 'ic'
        ? 'https://identity.ic0.app' // Mainnet
        : 'http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943'; // Local

function App() {
    const [authMode, setAuthMode] = useState(0); // 0: initial, 1: user, 2: guest
    const [authClient, setAuthClient] = useState();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('terbaru');
    const maxLength = 250; // Panjang maksimal teks sebelum dipotong
    const [isExpanded, setIsExpanded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [response, setResponse] = useState(''); // Comment
    const maxResponseLength = 280;
    const [isCurhatModalOpen, setIsCurhatModalOpen] = useState(false);
    const [curhatText, setCurhatText] = useState('');
    const [curhatUsername, setCurhatUsername] = useState('');
    const [curhatTitle, setCurhatTitle] = useState(''); // Added missing state
    const maxCurhatLength = 280;
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [comments, setComments] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [userPosts, setUserPosts] = useState([]);
    const [profileLoading, setProfileLoading] = useState(false);
    // create comment
    const [currentPostId, setCurrentPostId] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    // search post
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // dummy
    const fullText =
        'Lorem ipsum dolor sit amet consectetur. Auctor nam massa amet varius quam fusce hendrerit sit. Odio ornare lobortis vitae bibendum sit vel. Amet tortor eu lectus imperdiet nisi. Ullamcorper aliquam risus congue est posuere. Lacus pharetra sit a sit eget tincidunt placerat. Lacus quam facilisis tortor eget. Fames commodo pulvinar non pharetra. Non nunc volutpat nunc nunc. Eros lectus mauris libero tortor. Amet molestie amet dignissim.';

    const trimmedText = fullText.length > maxLength ? fullText.slice(0, maxLength) + '...' : fullText;

    async function handleProfileClick() {
        setShowProfile(true);
        setIsProfileOpen(false);

        // Fetch user's posts when profile is viewed
        // Only fetch posts if the user is logged in (not a guest)
        if (authMode === 1) {
            await fetchUserPosts();
        }
    }

    useEffect(() => {
        initializeAuthClient();
    }, []);

    useEffect(() => {
        if (authMode === 1 || authMode === 2) {
            fetchPosts();
        }
    }, [authMode, activeTab]);

    async function fetchUserPosts() {
        setProfileLoading(true);
        try {
            const actor = createActor(canisterId, {
                agentOptions: {
                    identity: await authClient.getIdentity()
                }
            });

            // Call the backend function to get the current user's posts
            const userPostsResult = await actor.getCurrUserPosts();
            // console.log("User posts result:", userPostsResult);

            // The response is an array of tuples with [id, {postData, user}]
            if (userPostsResult.length > 0) {
                const mappedPosts = userPostsResult.map(([id, post]) => ({
                    id: post.postData.id,
                    title: post.postData.title,
                    postText: post.postData.postText,
                    date: post.postData.date,
                    authorAlias: post.postData.authorAlias,
                    comments: post.postData.comments || []
                }));

                setUserPosts(mappedPosts);
            } else {
                setUserPosts([]);
            }
        } catch (error) {
            console.error('Error fetching user posts:', error);
            setUserPosts([]);
        } finally {
            setProfileLoading(false);
        }
    }

    async function fetchComments(userId, postId, index) {
        setLoading(true);
        try {
            const actor = createActor(canisterId, {
                agentOptions: {
                    identity: authMode === 1 ? await authClient.getIdentity() : undefined
                }
            });

            const postResult = await actor.selectPost(userId, postId);
            console.log('Fetched post details:', postResult);

            // Handle no comments case
            if (postResult[0].postData.comments.length === 0) {
                posts[index].comments = [
                    {
                        authorAlias: '-',
                        commentText: 'Belum ada komentar untuk post ini.',
                        date: new Date().toISOString().split('T')[0]
                    }
                ];
            } else {
                posts[index].comments = postResult[0].postData.comments;
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
            setErrorMsg('Gagal mengambil komentar. Silakan coba lagi nanti.');
        } finally {
            setLoading(false);
        }
    }

    async function submitComment() {
        if (response.trim() === '') {
            alert('Tanggapan tidak boleh kosong.');
            return;
        }

        setLoading(true);
        try {
            const actor = createActor(canisterId, {
                agentOptions: {
                    identity: await authClient.getIdentity()
                }
            });

            // Get the username (use "Anonim" if not provided)
            const alias = curhatUsername.trim() === '' ? 'Anonim' : curhatUsername.trim();

            // YYYY-MM-DD
            const currentDate = new Date().toISOString().slice(0, 10);

            const result = await actor.addComment(
                currentUserId, // The post author's ID
                currentPostId, // The post ID
                alias, // Comment author alias
                response, // Comment text
                currentDate // Current date
            );

            console.log('Comment submission result:', result);

            if (result.status === 'success') {
                // Clear the form and close the modal
                setResponse('');
                setIsModalOpen(false);
            } else {
                alert(result.message || 'Failed to submit comment');
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            setErrorMsg('Failed to submit comment. Please try again later.');
        } finally {
            setLoading(false);
        }
    }

    async function initializeAuthClient() {
        const client = await AuthClient.create();
        setAuthClient(client);
        const isAuthenticated = await client.isAuthenticated();
        setAuthMode(isAuthenticated ? 1 : 0);
    }

    async function login() {
        await authClient.login({
            identityProvider,
            onSuccess: () => {
                setAuthMode(1);
                initializeAuthClient();
            }
        });
    }

    function loginAsGuest() {
        setAuthMode(2);
    }

    async function logout() {
        if (authMode === 1) {
            await authClient.logout();
        }
        setAuthMode(0);
        setShowProfile(false);
    }

    async function fetchPosts() {
        setLoading(true);
        try {
            const actor = createActor(canisterId, {
                agentOptions: {
                    identity: authMode === 1 ? await authClient.getIdentity() : undefined
                }
            });
            const allPostsResult = await actor.getAllPosts(0, 1000); // Asumsi maksimal 1000 post, sesuaikan jika perlu
            console.log('Fetched all posts:', allPostsResult);

            let mappedPosts = [];

            mappedPosts = allPostsResult.map((post) => ({
                id: post.postData.id,
                title: post.postData.title,
                postText: post.postData.postText,
                date: post.postData.date,
                authorAlias: post.postData.authorAlias,
                user: post.user,
                comments: []
            }));

            if (activeTab === 'random') {
                // Acak array mappedPosts
                for (let i = mappedPosts.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [mappedPosts[i], mappedPosts[j]] = [mappedPosts[j], mappedPosts[i]];
                }
                // Ambil hanya 5 postingan pertama setelah diacak
                mappedPosts = mappedPosts.slice(0, 5);
            } else {
                // Jika tab "default", ambil 5 teratas atau latest (sesuai urutan dari backend)
                mappedPosts = mappedPosts.slice(0, 5);
            }

            setPosts(mappedPosts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            setErrorMsg('Gagal menampilkan curhat...');
        } finally {
            setLoading(false);
        }
    }

    async function submitCurhat() {
        if (curhatText.trim() === '') {
            alert('Curhatan tidak boleh kosong.');
            return;
        }

        setLoading(true);
        try {
            const actor = createActor(canisterId, {
                agentOptions: {
                    identity: await authClient.getIdentity()
                }
            });

            const alias = curhatUsername.trim() === '' ? 'Anonim' : curhatUsername.trim();
            const title = curhatTitle.trim() === '' ? 'Curhatan Anonim' : curhatTitle.trim();

            const response = await actor.addPost(
                title, // Title (using the state variable)
                alias, // Author Alias
                curhatText, // Post Text
                new Date().toISOString().slice(0, 10) // Date
            );

            console.log('Submit response:', response);

            if (response.status === 'success') {
                setIsCurhatModalOpen(false);
                setCurhatText('');
                setCurhatUsername('');
                setCurhatTitle('');
                fetchPosts(); // Added this to refresh posts after submitting

                // Also refresh user posts if in profile view
                if (showProfile && authMode === 1) {
                    fetchUserPosts();
                }
            } else {
                alert(response.message);
            }
        } catch (error) {
            console.error('Error submitting curhat:', error);
            setErrorMsg('Gagal mengunggah curhat...');
        } finally {
            setLoading(false);
        }
    }

    async function handleSearch(e) {
        e.preventDefault();
        if (searchQuery.trim() === '') {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setSearchResults(true);
        setIsSearching(true);

        try {
            const actor = createActor(canisterId, {
                agentOptions: {
                    identity: authMode === 1 ? await authClient.getIdentity() : undefined
                }
            });

            const results = await actor.searchPost(searchQuery);
            console.log('Search results:', results);

            // Map the results to match our posts format
            const mappedResults = results.map((post) => ({
                id: post.postData.id,
                title: post.postData.title,
                postText: post.postData.postText,
                date: post.postData.date,
                authorAlias: post.postData.authorAlias,
                user: post.user,
                comments: []
            }));

            setSearchResults(mappedResults);
        } catch (error) {
            console.error('Error searching posts:', error);
            setErrorMsg('Gagal mencari curhat...');
        } finally {
            setIsSearchLoading(false);
        }
    }

    // Add this function to clear search
    function clearSearch() {
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
    }

    return (
        <div className="container mx-auto min-h-screen flex flex-col items-center">
            {isMobileSearchOpen && (
                <div className="fixed inset-0 bg-white z-50 p-4 sm:hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-primary">Cari Curhatan</h3>
                        <button
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => setIsMobileSearchOpen(false)}
                        >
                            ✖
                        </button>
                    </div>

                    <form
                        onSubmit={(e) => {
                            handleSearch(e);
                            setIsMobileSearchOpen(false);
                        }}
                        className="relative"
                    >
                        <input
                            type="search"
                            placeholder="Cari curhat..."
                            className="w-full px-4 py-3 rounded-full bg-gray-100 border focus:outline-none focus:ring-2 focus:ring-primary"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="absolute right-0 top-0 mt-3 mr-4 text-gray-500 hover:text-primary"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </button>
                    </form>
                </div>
            )}
            {/* Header */}
            <div
                className={`w-full flex items-center py-4 px-6 bg-white justify-between ${
                    authMode !== 0 ? 'shadow-none' : 'shadow-sm'
                }`}
            >
                {/* Logo dan Nama */}
                <div
                    className="flex gap-2 items-center cursor-pointer"
                    onClick={() => {
                        setShowProfile(false);
                        if (authMode === 0) {
                            // If not logged in show login page
                        } else {
                            // Reset to homepage view for logged in users
                            setActiveTab('terbaru');
                            fetchPosts();
                        }
                    }}
                >
                    <img src="/logo-nobg.png" alt="Logo" className="h-12 w-auto" />
                    <p className="text-primary-light font-bold text-[20px]">Spillr</p>
                </div>
                {/* Search Bar - Only show when logged in (authMode 1 or 2) */}
                {(authMode === 1 || authMode === 2) && (
                    <div className="flex-grow max-w-md mx-4 hidden sm:block">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="search"
                                placeholder="Cari curhat..."
                                className="w-full px-4 py-2 rounded-full bg-gray-100 border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="absolute right-0 top-0 mt-2 mr-3 text-gray-500 hover:text-primary"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </button>
                        </form>
                    </div>
                )}

                {/* Mobile Search Button - Show only on small screens when logged in */}
                {(authMode === 1 || authMode === 2) && (
                    <div className="sm:hidden mr-2">
                        <button
                            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Jika login dengan Internet Identity */}
                {authMode === 1 && (
                    <div className="flex gap-2 items-center relative">
                        <button
                            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark"
                            onClick={() => setIsCurhatModalOpen(true)}
                        >
                            Mulai Curhat
                        </button>

                        {/* Icon Profil */}
                        <div className="relative">
                            <button onClick={() => setIsProfileOpen(!isProfileOpen)}>
                                <img src="/profile-icon.svg" alt="Profile" className="h-8 w-8" />
                            </button>

                            {/* Popup Menu */}
                            {isProfileOpen && (
                                <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md z-50">
                                    <button
                                        className="block w-full px-4 py-2 text-left hover:bg-primary-background"
                                        onClick={handleProfileClick}
                                    >
                                        Profil
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-error"
                                    >
                                        Keluar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Jika belum login, hanya tombol "Mulai Curhat" */}
                {authMode === 2 && (
                    <button onClick={login} className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark">
                        Mulai Curhat
                    </button>
                )}
            </div>

            {/* Body */}
            <div className="w-full flex-grow flex flex-col items-center">
                {authMode === 0 && (
                    // Login Page
                    <div className="flex flex-col items-center space-y-4 rounded-2xl border border-gray-300 bg-white shadow-lg p-6 max-w-xs mx-auto mt-16">
                        <h1 className="mb-6 text-2xl font-bold text-center text-primary">
                            Yuk masuk dulu biar bisa curhat bareng!
                        </h1>
                        <button
                            onClick={login}
                            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark w-full"
                        >
                            Masuk dengan Internet Identity
                        </button>
                        <button
                            onClick={loginAsGuest}
                            className="rounded bg-gray-200 px-4 py-2 text-primary-dark hover:bg-gray-300 w-full"
                        >
                            Masuk dengan Guest Mode
                        </button>
                    </div>
                )}

                {showProfile ? (
                    // Tampilan Profil
                    <div className="text-center w-full p-4">
                        <h2 className="text-2xl font-semibold text-primary">Profil</h2>
                        {authMode !== 1 ? (
                            <div className="text-center p-4 border rounded-lg shadow">
                                <p>Fitur ini hanya tersedia untuk pengguna yang login dengan Internet Identity.</p>
                                <button
                                    onClick={login}
                                    className="mt-4 rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark"
                                >
                                    Masuk dengan Internet Identity
                                </button>
                            </div>
                        ) : profileLoading ? (
                            <div className="text-center p-6">
                                <p>Loading posts...</p>
                            </div>
                        ) : userPosts.length === 0 ? (
                            <div className="text-center p-6 border rounded-lg shadow">
                                <p>Kamu belum membuat curhatan. Ayo buat curhatan pertamamu!</p>
                                <button
                                    className="mt-4 rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark"
                                    onClick={() => setIsCurhatModalOpen(true)}
                                >
                                    Mulai Curhat
                                </button>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-primary-dark">Curhatan Saya</h3>

                                {userPosts.map((post) => (
                                    <div key={post.id} className="rounded-lg border p-4 shadow text-left my-4">
                                        <h3 className="text-lg font-bold">{post.title}</h3>
                                        <p className="mt-2">{post.postText}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src="/iconamoon_clock-light.svg"
                                                        alt="Clock"
                                                        className="w-24 w-auto"
                                                    />
                                                    <p className="text-sm text-gray-500">{post.date}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <img src="/mdi_anonymous.svg" alt="User" className="w-24 w-auto" />
                                                    <p className="text-sm text-gray-500">{post.authorAlias}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Comments section */}
                                        <div className="mt-4 border-t pt-2">
                                            <h4 className="font-semibold mb-2">
                                                Tanggapan ({post.comments?.length || 0})
                                            </h4>

                                            {post.comments?.length > 0 ? (
                                                post.comments.map((comment, index) => (
                                                    <div key={index} className="flex flex-col my-2 p-2 border-b">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold">{comment.authorAlias}</p>
                                                            <p className="text-gray-500 text-sm">{comment.date}</p>
                                                        </div>
                                                        <p className="mt-1">{comment.commentText}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500">Belum ada tanggapan.</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Tampilan Beranda (kondisi awal)
                    (authMode === 1 || authMode === 2) && (
                        <div className="text-center w-full">
                            {/* Hero Section */}
                            <div className="relative w-full h-64 z-2">
                                <img
                                    src="/bg-spillr-mesh.png"
                                    alt="Background"
                                    className="absolute inset-0 w-full h-full object-cover "
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <h2 className="mb-4 text-xl font-semibold text-primary text-white text-center">
                                        Curhat bebas dan anonim, karena identitasmu aman dengan blockchain.
                                    </h2>
                                </div>
                            </div>

                            {/* Tab */}
                            <div className="flex mt-4">
                                <button
                                    className={`px-4 py-2 text-sm font-medium ${
                                        activeTab === 'terbaru'
                                            ? 'bg-primary-background text-primary-dark border-b-4 border-primary'
                                            : 'text-primary-light hover:text-primary'
                                    }`}
                                    onClick={() => setActiveTab('terbaru')}
                                >
                                    Curhatan Terbaru
                                </button>
                                <button
                                    className={`px-4 py-2 text-sm font-medium ${
                                        activeTab === 'random'
                                            ? 'bg-primary-background text-primary-dark border-b-4 border-primary'
                                            : 'text-primary-light hover:text-primary'
                                    }`}
                                    onClick={() => setActiveTab('random')}
                                >
                                    Curhatan Random
                                </button>
                            </div>

                            {/* Search result */}
                            {searchResults.length > 0 && (
                                <div className="w-full mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-semibold text-primary">
                                            Hasil Pencarian: {searchQuery}
                                        </h3>
                                        <button
                                            onClick={clearSearch}
                                            className="text-sm text-primary hover:text-primary-dark"
                                        >
                                            Clear Search
                                        </button>
                                    </div>

                                    {searchResults.map((post, index) => (
                                        <div key={post.id} className="rounded-lg border p-4 shadow text-left my-4">
                                            <h3 className="text-lg font-bold">{post.title}</h3>
                                            <p className="mt-2">{post.postText}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src="/iconamoon_clock-light.svg"
                                                            alt="Clock"
                                                            className="w-24 w-auto"
                                                        />
                                                        <p className="text-sm text-gray-500">{post.date}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src="/mdi_anonymous.svg"
                                                            alt="User"
                                                            className="w-24 w-auto"
                                                        />
                                                        <p className="text-sm text-gray-500">{post.authorAlias}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 items-center space-x-2 mt-2">
                                                    <button
                                                        onClick={() => fetchComments(post.user, post.id, index)}
                                                        className="mt-2 px-4 py-2 bg-primary-background text-primary-dark rounded hover:bg-primary hover:shadow-sm hover:text-primary-light"
                                                    >
                                                        🗨️ Tanggapan Orang
                                                    </button>
                                                    {authMode === 1 ? (
                                                        <button
                                                            className="mt-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark hover:shadow-sm"
                                                            onClick={() => {
                                                                setCurrentPostId(post.id);
                                                                setCurrentUserId(post.user);
                                                                setIsModalOpen(true);
                                                            }}
                                                        >
                                                            ✍️ Tanggapi Curhatan
                                                        </button>
                                                    ) : (
                                                        <p className="mt-2 text-sm text-gray-500">
                                                            Masuk sebagai user untuk menanggapi
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Comments for search results */}
                                            <div className="my-4 border-t pt-2">
                                                {post.comments.length > 0 ? (
                                                    post.comments.map((comment, index) => (
                                                        <div key={index} className="flex gap-2">
                                                            <p className="mt-2 font-bold">{comment.authorAlias}</p>
                                                            <p className="mt-2">{comment.commentText}</p>
                                                            <p className="mt-2 text-gray-500">{comment.date}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-gray-500">Belum ada tanggapan.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Loading indicator for search */}
                            {isSearchLoading && (
                                <div className="w-full flex justify-center my-4">
                                    <p>Mencari curhatan...</p>
                                </div>
                            )}

                            {/* Post data */}
                            {loading ? (
                                <p>Loading posts...</p>
                            ) : !isSearching ? (
                                <div className="">
                                    {posts.map((post, index) => (
                                        <div key={post.id} className="rounded-lg border p-4 shadow text-left my-4">
                                            <h3 className="text-lg font-bold">{post.title}</h3>
                                            <p className="mt-2">{post.postText}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src="/iconamoon_clock-light.svg"
                                                            alt="Clock"
                                                            className="w-24 w-auto"
                                                        />
                                                        <p className="text-sm text-gray-500">{post.date}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src="/mdi_anonymous.svg"
                                                            alt="User"
                                                            className="w-24 w-auto"
                                                        />
                                                        <p className="text-sm text-gray-500">{post.authorAlias}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 items-center space-x-2 mt-2">
                                                    <button
                                                        onClick={() => fetchComments(post.user, post.id, index)}
                                                        className="mt-2 px-4 py-2 bg-primary-background text-primary-dark rounded hover:bg-primary hover:shadow-sm hover:text-primary-light"
                                                    >
                                                        🗨️ Tanggapan Orang
                                                    </button>
                                                    {/* Jika user, bisa kasih komentar. Jika guest, hanya teks info */}
                                                    {authMode === 1 ? (
                                                        <button
                                                            className="mt-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark hover:shadow-sm"
                                                            onClick={() => {
                                                                setCurrentPostId(post.id);
                                                                setCurrentUserId(post.user);
                                                                setIsModalOpen(true);
                                                            }}
                                                        >
                                                            ✍️ Tanggapi Curhatan
                                                        </button>
                                                    ) : (
                                                        <p className="mt-2 text-sm text-gray-500">
                                                            Masuk sebagai user untuk menanggapi
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Komentar Orang Muncul Disini, nah panggil comen dsini */}
                                            <div className="my-4 border-t pt-2">
                                                {loading ? (
                                                    <p>Loading comments...</p>
                                                ) : errorMsg ? (
                                                    <p className="text-red-500">{errorMsg}</p>
                                                ) : (
                                                    post.comments.map((comment, index) => (
                                                        <div key={index} className="flex gap-2">
                                                            <p className="mt-2 font-bold">{comment.authorAlias}</p>
                                                            <p className="mt-2">{comment.commentText}</p>
                                                            <p className="mt-2 text-gray-500">{comment.date}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Modal Popup */}
                                    {isModalOpen && (
                                        <div className="fixed inset-0 flex items-center justify-center z-50">
                                            {/* Backdrop */}
                                            <div
                                                className="absolute inset-0 bg-black opacity-50"
                                                onClick={() => setIsModalOpen(false)}
                                            ></div>

                                            {/* Modal Content */}
                                            <div className="bg-white p-5 rounded-lg shadow-lg z-50 w-96">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="text-lg font-bold">Tanggapi Curhatan</h3>
                                                    <button
                                                        className="text-gray-500 hover:text-gray-700"
                                                        onClick={() => setIsModalOpen(false)}
                                                    >
                                                        ✖
                                                    </button>
                                                </div>
                                                <textarea
                                                    className="w-full mt-3 p-2 border rounded resize-none focus:outline-none focus:ring focus:ring-primary-light"
                                                    rows="4"
                                                    placeholder="Tulis tanggapanmu..."
                                                    value={response}
                                                    onChange={(e) => setResponse(e.target.value)}
                                                    maxLength={280}
                                                ></textarea>
                                                <button
                                                    disabled={
                                                        response.length === 0 || response.length > maxResponseLength
                                                    }
                                                    className={`mt-2 px-4 py-2 rounded ${
                                                        response.length === 0 || response.length > maxResponseLength
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-primary text-white hover:bg-primary-dark'
                                                    }`}
                                                    onClick={submitComment}
                                                >
                                                    Kirim
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <button className="rounded mt-2 px-4 py-2 text-primary-dark bg-primary-background">
                                            Lihat Curhatan Lainnya
                                        </button>
                                    </div>

                                    <div className="text-primary w-full my-5 p-4 ">
                                        <p className="text-2xl py-5">
                                            Kadang, kita cuma butuh <b>tempat buat cerita.</b> <br />
                                            Kejadian tak terduga, pikiran yang menumpuk, atau perasaan yang sulit
                                            diungkap. <br />
                                            Di sini, kamu bisa <b>spill tanpa khawatir</b> siapa pun tahu siapa kamu.{' '}
                                            <br />
                                            Aman, bebas, dan tetap rahasia.
                                        </p>
                                    </div>

                                    <div className="text-white bg-primary w-full mt-5 p-4 rounded-tl-md rounded-tr-md rounded-bl-none rounded-br-none">
                                        <h2 className="text-4xl mb-3">Ada Cerita Apa Hari Ini?</h2>
                                        <button
                                            className="rounded bg-primary-background px-4 py-2 text-primary hover:bg-primary-dark"
                                            onClick={() => setIsCurhatModalOpen(true)}
                                        >
                                            Mulai Curhat
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div></div>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Modal Curhat */}
            {isCurhatModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black opacity-50"
                        onClick={() => setIsCurhatModalOpen(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="bg-white p-6 rounded-lg shadow-lg z-50 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-primary">Mulai Curhat</h2>
                            <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={() => setIsCurhatModalOpen(false)}
                            >
                                ✖
                            </button>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
                                Judul Curhat (Opsional):
                            </label>
                            <input
                                type="text"
                                id="title"
                                className="w-full py-2 px-3 border rounded focus:outline-none focus:ring focus:ring-primary-light"
                                placeholder="Berikan judul curhatmu"
                                value={curhatTitle}
                                onChange={(e) => setCurhatTitle(e.target.value)}
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
                                Username (Optional):
                            </label>
                            <input
                                type="text"
                                id="username"
                                className="w-full py-2 px-3 border rounded resize-none focus:outline-none focus:ring focus:ring-primary-light"
                                placeholder="Nama samaranmu"
                                value={curhatUsername}
                                onChange={(e) => setCurhatUsername(e.target.value)}
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="curhatText" className="block text-gray-700 text-sm font-bold mb-2">
                                Isi Curhatan:
                            </label>
                            <textarea
                                id="curhatText"
                                className="w-full py-2 px-3 border rounded resize-none focus:outline-none focus:ring focus:ring-primary-light"
                                rows="5"
                                placeholder="Apa yang ingin kamu ceritakan?"
                                value={curhatText}
                                onChange={(e) => setCurhatText(e.target.value)}
                                maxLength={maxCurhatLength}
                            ></textarea>
                            <p className="text-gray-500 text-xs italic">Maksimal {maxCurhatLength} karakter</p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                className="bg-primary-background hover:bg-primary text-primary py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
                                onClick={() => setIsCurhatModalOpen(false)}
                            >
                                Batal
                            </button>
                            <button
                                className={`bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                                    curhatText.trim() === '' || curhatText.length > maxCurhatLength
                                        ? 'opacity-50 cursor-not-allowed'
                                        : ''
                                }`}
                                onClick={submitCurhat}
                                disabled={curhatText.trim() === '' || curhatText.length > maxCurhatLength}
                            >
                                Kirim Curhat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center text-white p-3 bg-primary-dark w-full">
                <p>© Spillr 2025</p>
            </div>
        </div>
    );
}

export default App;