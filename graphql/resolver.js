const bcrypt = require('bcryptjs');
const User=require('../models/user');
const validator=require('validator');
const jwt=require('jsonwebtoken');
const Post=require('../models/post');
const {deleteImage}=require('../util/deleteImage');

module.exports={
    createUser:async function({userInput},req){
        const email=userInput.email;
        const userCheck=await User.findOne({email:email});
        const name=userInput.name;
        const password=userInput.password;
        const errors=[];
        if(!validator.isEmail(email)){
            errors.push({message:'EMail is invalid'});
        }
        if(validator.isEmpty(password) ||!validator.isLength(password,{min:5})){
            errors.push({
              message: "password is invalid must be atleast 5 letters",
            });
        }
        if(validator.isEmpty(name) || !validator.isLength(name,{min:5})){
            errors.push({message:'name is invalid must be atleast 5 letters'})
        }
        if(errors.length>0){
            const error=new Error('input is invalid')
            error.data=errors;
            error.code=422;
            throw error;
        }
        if(userCheck){
            const error=new Error('Email already exist');
            error.code=401;
            throw error;
        }
        const hashpass=await bcrypt.hash(password,12);
        const user=new User({email:email,password:hashpass,name:name});
        const result=await user.save();
        return{
            ...result._doc,_id:result._id.toString()
        }
    },
    login:async function({email,password},req){
        const errors=[];
        if(!validator.isEmail(email)){
            errors.push({message:'Email is invalid'});
        }
        if(validator.isEmpty(password)){
            errors.push({message:'Please enter password'});
        }
        if(errors.length>0){
            const error=new Error('Input is invalid');
            error.data=errors;
            error.code=422;
            throw error;
        }
        const existUser=await User.findOne({email:email});
        if(!existUser){
            const error=new Error('User does not exist');
            error.code=404;
            throw error;
        }
        const isMatch=await bcrypt.compare(password,existUser.password);
        if(!isMatch){
            const error=new Error("Password doesn't match");
            error.code=401;
            throw error;
        }
        const token=await jwt.sign({email:email,userId:existUser._id.toString()},'somesecret',{expiresIn:'1h'});
        return{
            userId:existUser._id.toString(),token:token
        }
    },

    createPost:async function({postInput},req){
        if(!req.isAuth){
            const error=new Error('Not authenticated');
            error.code=401;
            throw error;
        }
        const title=postInput.title;
        const content=postInput.content;
        const imageUrl=postInput.imageUrl;
        const errors=[];
        if(validator.isEmpty(title) || !validator.isLength(title,{min:5})){
            errors.push({message:'Invalid title'});
        }
        if(validator.isEmpty(content) || !validator.isLength(content,{min:5})){
            errors.push({message:'Content is invalid must be of atleast 5 character'});
        }
        if(validator.isEmpty(imageUrl)){
            errors.push({message:'ImageUrl is invalid'});
        }
        if (errors.length > 0) {
          const error = new Error("Invalid input.");
          error.data = errors;
          error.code = 422;
          throw error;
        }
        const user=await User.findById(req.userId);
        if (!user) {
          const error = new Error("Invalid user.");
          error.code = 401;
          throw error;
        }
        const post=new Post({title:title,content:content,imageUrl:imageUrl,creator:user});
        const createdPost=await post.save();
        user.posts.push(createdPost);
        await user.save();
        return{
            ...createdPost._doc,_id:createdPost._id.toString(),createdAt:createdPost.createdAt.toISOString(),updatedAt:createdPost.updatedAt.toISOString()
        }
    },

    posts:async function({page},req){
        if (!req.isAuth) {
          const error = new Error("Not authenticated");
          error.code = 401;
          throw error;
        }
        if(!page){
            page=1;
        }
        const perPage=2;
        const totalPosts=await Post.find().countDocuments();
        const posts=await Post.find().sort({createdAt:-1}).skip((page-1)*perPage).limit(perPage).populate('creator');
        return {
            totalPosts:totalPosts,posts:posts.map(p=>{
                return{
                    ...p._doc,
                    _id:p._id.toString(),
                    createdAt:p.createdAt.toISOString(),
                    updatedAt:p.updatedAt.toISOString(),
                }
            })
        }
    },

    status:async function(args,req){
        if (!req.isAuth) {
          const error = new Error("Not authenticated");
          error.code = 401;
          throw error;
        }
        const user=await User.findById(req.userId);
        if(!user){
            const error = new Error("Invalid user.");
            error.code = 401;
            throw error;
        }
        return {
            status:user.status
        }
    },
    updateStatus:async function({status},req){
        if(!req.isAuth){
            const error = new Error("Not authenticated");
            error.code = 401;
            throw error;
        }
        const errors=[];
        if(validator.isEmpty(status)){
            errors.push({message:'Invalid Status'});
        }
        if(errors.length>0){
            const error=new Error('Invalid status');
            error.data=errors;
            error.code=422;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
          const error = new Error("Invalid user.");
          error.code = 401;
          throw error;
        }
        user.status=status;
        await user.save();

        return{
            message:'Status updated',
        }
    },
    post:async function({id},req){
        if (!req.isAuth) {
          const error = new Error("Not authenticated");
          error.code = 401;
          throw error;
        }
        const post=await Post.findById(id).populate('creator');
        if(!post){
            const error=new Error('post not found');
            error.code=404;
            throw error;
        }
        return{
            ...post._doc,_id:post._id.toString(),createdAt:post.createdAt.toISOString(),updatedAt:post.updatedAt.toISOString()
        }
    },
    deletePost:async function({id},req){
        if (!req.isAuth) {
          const error = new Error("Not authenticated");
          error.code = 401;
          throw error;
        }
        const post = await Post.findById(id);
        if (!post) {
          const error = new Error("post not found");
          error.code = 404;
          throw error;
        }
        if (req.userId.toString() !== post.creator.toString()) {
            const error = new Error("Not authenticated");
            error.code = 401;
            throw error;
        }
        deleteImage(post.imageUrl);
        await Post.findByIdAndDelete(id);
        const user = await User.findById(req.userId);
        user.posts.pull(id);
        await user.save();
        return{
            message:'Post deleted'
        }        
    },
    updatePost:async function({id,postInput},req){
        if (!req.isAuth) {
          const error = new Error("Not authenticated");
          error.code = 401;
          throw error;
        }
        const post = await Post.findById(id).populate('creator');
        if (!post) {
          const error = new Error("post not found");
          error.code = 404;
          throw error;
        }
        if (req.userId.toString() !== post.creator._id.toString()) {
          const error = new Error("Not authenticated");
          error.code = 401;
          throw error;
        }
        const title = postInput.title;
        const content = postInput.content;
        const imageUrl = postInput.imageUrl;
        const errors = [];
        if (
          validator.isEmpty(title) ||
          !validator.isLength(title, { min: 5 })
        ) {
          errors.push({ message: "Invalid title" });
        }
        if (
          validator.isEmpty(content) ||
          !validator.isLength(content, { min: 5 })
        ) {
          errors.push({
            message: "Content is invalid must be of atleast 5 character",
          });
        }
        if (errors.length > 0) {
          const error = new Error("Invalid input.");
          error.data = errors;
          error.code = 422;
          throw error;
        }
        post.title=title;
        post.content=content;
        if(imageUrl!=='undefined'){
            post.imageUrl=imageUrl;
        }
        const updatedPost=await post.save();
        return {
          ...updatedPost._doc,
          _id: updatedPost._id.toString(),
          createdAt: updatedPost.createdAt.toISOString(),
          updatedAt: updatedPost.updatedAt.toISOString(),
        };
    }
}