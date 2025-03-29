import HashMap "mo:map/Map";
import Vector "mo:vector";
import Blob "mo:base/Blob";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import { phash; n32hash } "mo:map/Map";
import Array "mo:base/Array";
import IC "ic:aaaaa-aa";
import Nat32 "mo:base/Nat32";

// import Debug "mo:base/Debug";

persistent actor AnonymousPost {

    type PostComment = {
        authorAlias : Text;
        commentText : Text;
        date : Text;
    };

    type PostData = {
        id : Nat32;
        title : Text;
        authorAlias : Text;
        postText : Text;
        date : Text;
        comments : [PostComment];
    };

    type AnonymousPost = {
        user : Principal;
        postData : PostData;
    };

    type PostResponse = {
        status : Text;
        message : Text;
    };

    type UserPosts = HashMap.Map<Principal, [AnonymousPost]>;

    type PostAddress = HashMap.Map<Nat32, AnonymousPost>;

    private let usersPosts = HashMap.new<Principal, PostAddress>();

    private let usedIds = HashMap.new<Nat32, ()>();

    private let postsBank = Vector.new<AnonymousPost>();

    private func tryGenerate() : async Nat32 {
        let randBlob = await IC.raw_rand();
        let newId = Blob.hash(randBlob);
        let exists = HashMap.get<Nat32, ()>(usedIds, n32hash, newId);

        if (exists == null) {
            ignore HashMap.put(usedIds, n32hash, newId, ());
            return newId;
        } else {
            return await tryGenerate();
        };
    };

    private func generateUniqueId() : async Nat32 {
        await tryGenerate();
    };

    // Get Semua Post yang tercatat
    public shared func getAllPosts(offset : Nat, length : Nat) : async [AnonymousPost] {
        let newVec = Vector.toArray(
            postsBank
        );

        try {
            var mutLength = length;
            var mutOffset = offset;

            if (mutLength > 10) {
                mutLength := 10;
            };

            let currVecSize : Nat = Array.size(newVec);

            if (mutOffset >= currVecSize) {
                mutOffset := 0;
            };

            var totalLength : Nat = mutLength + mutOffset;

            if (totalLength > currVecSize) {
                mutLength := currVecSize - mutOffset;
            };

            Array.subArray(newVec, mutOffset, mutLength);

        } catch (_) {

            let emptyArr = Vector.new<AnonymousPost>();
            Vector.toArray<AnonymousPost>(emptyArr);
        };
    };

    // Get semua post yang dimiliki oleh user yang sedang login
    public shared (msg) func getCurrUserPosts() : async [(Nat32, AnonymousPost)] {
        switch (HashMap.get(usersPosts, phash, msg.caller)) {
            case null [];
            case (?currUserPosts) {
                HashMap.toArray(currUserPosts);
            };
        };
    };

    // Menambahkan post pada database post
    public shared (msg) func addPost(
        title : Text,
        authorAlias : Text,
        postText : Text,
        date : Text
    ) : async PostResponse {

        if (Text.size(postText) == 0) {
            return {
                status = "error";
                message = "Isi post tidak boleh kosong.";
            };
        };

        if (Text.size(postText) > 280) {
            return {
                status = "error";
                message = "Post terlalu panjang. Maksimal 280 karakter.";
            };
        };

        let newId = await generateUniqueId();

        let postData = {
            id = newId;
            title = title;
            authorAlias = authorAlias;
            postText = postText;
            date = date;
            comments = [];
        };

        let anonymousPost = {
            user = msg.caller;
            postData = postData;
        };

        let _ = Vector.add<AnonymousPost>(postsBank, anonymousPost);

        switch (HashMap.get(usersPosts, phash, msg.caller)) {
            case null {

                let newMap = HashMap.new<Nat32, AnonymousPost>();
                let _ = HashMap.put<Nat32, AnonymousPost>(newMap, n32hash, newId, anonymousPost);

                let _ = HashMap.put<Principal, PostAddress>(
                    usersPosts,
                    phash,
                    msg.caller,
                    newMap
                );
            };
            case (?currUserPosts) {
                let _ = HashMap.put<Nat32, AnonymousPost>(currUserPosts, n32hash, newId, anonymousPost);
            };
        };

        {
            status = "success";
            message = "Post berhasil ditambahkan!";
        };
    };

    // Mencari post tertentu
    public shared query func searchPost(keyword : Text) : async [AnonymousPost] {
        let lowerKeyword = Text.toLowercase(keyword);
        let postArray = Vector.toArray(postsBank);

        let result = Array.filter<AnonymousPost>(
            postArray,
            func(post : AnonymousPost) : Bool {
                let titleLower = Text.toLowercase(post.postData.title);
                let aliasLower = Text.toLowercase(post.postData.authorAlias);
                let postLower = Text.toLowercase(post.postData.postText);

                Text.contains(titleLower, #text lowerKeyword) or Text.contains(aliasLower, #text lowerKeyword) or Text.contains(postLower, #text lowerKeyword);
            }
        );

        result;
    };

    // Menambahkan comment pada post tertentu
    public shared func addComment(userId : Principal, postId : Nat32, authorAlias : Text, commentText : Text, date : Text) : async PostResponse {
        // get post tertentu
        switch (HashMap.get(usersPosts, phash, userId)) {
            case null {
                {
                    status = "error";
                    message = "Post tidak ditemukan!";
                };
            };
            case (?postAddr) {

                switch (HashMap.get<Nat32, AnonymousPost>(postAddr, n32hash, postId)) {
                    case null {
                        {
                            status = "error";
                            message = "Post tidak ditemukan!";
                        };
                    };
                    case (?postDetail) {
                        //input comment baru
                        let newComment : PostComment = {
                            authorAlias = authorAlias;
                            commentText = commentText;
                            date = date;
                        };

                        let updatedPost = {
                            id = postDetail.postData.id;
                            title = postDetail.postData.title;
                            authorAlias = postDetail.postData.authorAlias;
                            postText = postDetail.postData.postText;
                            date = postDetail.postData.date;
                            comments = Array.append(postDetail.postData.comments, [newComment]);
                        };

                        let anonymousPost = {
                            user = userId;
                            postData = updatedPost;
                        };

                        let _ = HashMap.put<Nat32, AnonymousPost>(postAddr, n32hash, postId, anonymousPost);

                        {
                            status = "success";
                            message = "Comment berhasil ditambahkan!";
                        };
                    };
                };
            };
        };
    };

    // Mendapatkan detail post tertentu berdasarkan user id: Principal dan post id: Nat32
    public shared func selectPost(userId : Principal, postId : Nat32) : async ?AnonymousPost {
        switch (HashMap.get(usersPosts, phash, userId)) {
            case null null;
            case (?postAddr) {
                HashMap.get<Nat32, AnonymousPost>(postAddr, n32hash, postId);
            };
        };

    };
};