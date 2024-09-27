import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Notification from "../models/notification.model.js";
import {v2 as cloudinary} from "cloudinary";

export const getUserProfile = async (req, res) => {
    const { username } = req.params;
    
    try {
        const user = await User.findOne({ username }).select("-password");
        if(!user){
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in the getUserProfile controller", error.message);
       res.status(500).json({error: error.message}); 
    }
}

export const followUnfollowUser = async (req, res) => {
   
   try {
    const { id } = req.params;
    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    if(id === req.user._id.toString()){
        return res.status(400).json({ message: "You can't follow yourself" });
    }

    if(!userToModify || !currentUser){
        return res.status(404).json({ message: "User not found" });
    }
    const isFollowing = currentUser.following.includes(id);

    if(isFollowing){
        //unfollow the user
        await User.findByIdAndUpdate(id, {$pull: {follwers: req.user._id} });
        await User.findByIdAndUpdate(id, {$pull: {following: req.user._id} });
        res.status(200).json({message: "Unfollowed successfully"});
    }else{
        //follow the user
        await User.findByIdAndUpdate(id,{ $push: {followers: req.user._id} });
        await User.findByIdAndUpdate(id, { $push: {following: req.user._id} });
        // send notification
        const newNotification = new Notification({
            type:"follow",
            from: req.user._id,
            to: userToModify._id
        });

        await newNotification.save();


        res.status(200).json({message: "Followed successfully"});
    }
   } catch (error) {
     console.log("Error in followUnfollow controller", error.message)
     res.status(500).json({message: "Internal server error"});
   }
}

export const getSuggestedUsers = async (req, res) => {
	try {
		const userId = req.user._id;

		const usersFollowedByMe = await User.findById(userId).select("following");

		const users = await User.aggregate([
			{
				$match: {
					_id: { $ne: userId },
				},
			},
			{ $sample: { size: 10 } },
		]);

		// 1,2,3,4,5,6,
		const filteredUsers = users.filter((user) => !usersFollowedByMe.following.includes(user._id));
		const suggestedUsers = filteredUsers.slice(0, 4);

		suggestedUsers.forEach((user) => (user.password = null));

		res.status(200).json(suggestedUsers);
	} catch (error) {
		console.log("Error in getSuggestedUsers: ", error.message);
		res.status(500).json({ error: error.message });
	}
}

export const updateUserProfile = async (req, res) => {
	const { fullName, email, username, currentPassword, newPassword, bio, link } = req.body;
	let { profileImg, coverImg } = req.body;

	const userId = req.user._id;

	try {
		let user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
			return res.status(400).json({ error: "Please provide both current password and new password" });
		}

		if (currentPassword && newPassword) {
			const isMatch = await bcrypt.compare(currentPassword, user.password);
			if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });
			if (newPassword.length < 6) {
				return res.status(400).json({ error: "Password must be at least 6 characters long" });
			}

			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(newPassword, salt);
		}
          
		if(profileImg){
			if(user.profileImg){
				await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
			}
        const uploadedResponse = await cloudinary .uploader.upload(profileImg)
		profileImg= uploadedResponse.secure_url;
		}

		if(coverImg){
        const uploadedResponse = await cloudinary .uploader.upload(coverImg) 
		coverImg= uploadedResponse.secure_url;
		}
		
        user.fullName = fullName  || user.fullName;
		user.username = username || user.username;	
		user.email = email || user.email;
		user.bio = bio || user.bio;
		user.link = link || user.link;
		user.profileImg = profileImg || user.profileImg;
		user.coverImg = coverImg || user.coverImg;
		
		await user.save();
		//password should be null in response
		user.password = null;
		res.status(200).json({ message: "User updated successfully" });
		
	} catch (error) {
		console.log("Error in updateUser: ", error.message);
		res.status(500).json({ error: error.message });
	}
};