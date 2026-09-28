import { randomUUID } from "node:crypto";
import { MongoClient, type Db, type Document, type Filter, type ObjectId } from "mongodb";
import type {
  InsertUser,
  Job,
  Review,
  ServiceCategory,
  ServiceRequest,
  User,
  WorkerProfile,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

type MongoDocument<T> = T & { _id?: ObjectId };
type LocalCredential = {
  userId: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
};
export type WorkerLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  updatedAt: Date;
};
type RequestDocument = MongoDocument<ServiceRequest & { workerLocation?: WorkerLocation }>;
type Counter = { _id: string; value: number };

let mongoClient: MongoClient | null = null;
let database: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

export const demoCategories = [
  { id: 1, name: "Electrical", description: "Wiring, repairs & installations", groupName: "Household", icon: "bolt", accent: "amber" },
  { id: 2, name: "Plumbing", description: "Leaks, fittings & water systems", groupName: "Household", icon: "droplets", accent: "sky" },
  { id: 3, name: "Carpentry", description: "Furniture, doors & woodwork", groupName: "Household", icon: "hammer", accent: "orange" },
  { id: 4, name: "Cleaning", description: "Homes, societies & deep cleans", groupName: "Household", icon: "sparkles", accent: "violet" },
  { id: 5, name: "Appliance Repair", description: "Fast fixes for everyday appliances", groupName: "Household", icon: "wrench", accent: "rose" },
  { id: 6, name: "Gardening", description: "Plants, lawns & green spaces", groupName: "Community", icon: "leaf", accent: "emerald" },
  { id: 7, name: "Farm Assistance", description: "Seasonal work & equipment help", groupName: "Agriculture", icon: "sprout", accent: "lime" },
  { id: 8, name: "Painting", description: "Interior, exterior & woodwork", groupName: "Household", icon: "paintbrush", accent: "fuchsia" },
];

export const demoWorkers = [
  { id: 1, userId: 101, displayName: "Aarav Kulkarni", category: "Electrical", bio: "Certified electrician specializing in safe home rewiring and appliance installations.", neighborhood: "Kothrud", city: "Pune", yearsExperience: 8, rating: 490, totalJobs: 182, verified: 1, available: 1, hourlyRate: 650, avatarUrl: null, skills: "Rewiring, Fans, MCBs", latitude: "18.5074", longitude: "73.8077" },
  { id: 2, userId: 102, displayName: "Meera Shaikh", category: "Plumbing", bio: "Reliable plumbing support for homes, offices and housing societies.", neighborhood: "Baner", city: "Pune", yearsExperience: 6, rating: 480, totalJobs: 146, verified: 1, available: 1, hourlyRate: 550, avatarUrl: null, skills: "Leak repair, Fittings", latitude: "18.5590", longitude: "73.7868" },
  { id: 3, userId: 103, displayName: "Rohan Jadhav", category: "Carpentry", bio: "Thoughtful woodwork and furniture repairs with transparent estimates.", neighborhood: "Aundh", city: "Pune", yearsExperience: 11, rating: 500, totalJobs: 239, verified: 1, available: 0, hourlyRate: 700, avatarUrl: null, skills: "Furniture, Doors", latitude: "18.5594", longitude: "73.8070" },
  { id: 4, userId: 104, displayName: "Kavya More", category: "Cleaning", bio: "Community-minded home and office cleaning with eco-friendly supplies.", neighborhood: "Viman Nagar", city: "Pune", yearsExperience: 4, rating: 470, totalJobs: 98, verified: 1, available: 1, hourlyRate: 400, avatarUrl: null, skills: "Deep clean, Move-out", latitude: "18.5679", longitude: "73.9143" },
];

export const demoRequests = [
  { id: "REQ-1048", serviceName: "Electrical repair", description: "Ceiling fan making a buzzing sound", address: "Kothrud, Pune", preferredDate: "Today", preferredTime: "4:00 PM", budget: 850, status: "open", customerName: "Nisha Patil" },
  { id: "REQ-1047", serviceName: "Plumbing", description: "Kitchen sink has a slow leak", address: "Baner, Pune", preferredDate: "Tomorrow", preferredTime: "10:30 AM", budget: 700, status: "accepted", customerName: "Dev Shah" },
  { id: "REQ-1043", serviceName: "Appliance repair", description: "Washing machine is not draining", address: "Aundh, Pune", preferredDate: "Sep 29", preferredTime: "2:00 PM", budget: 1200, status: "completed", customerName: "Ira Menon" },
];

function plain<T extends Document>(document: T): Omit<T, "_id"> {
  const { _id, ...result } = document;
  return result;
}

export async function getDb(): Promise<Db | null> {
  const uri = ENV.mongoUri;
  if (!uri) return null;
  if (database) return database;

  if (!connectionPromise) {
    connectionPromise = (async () => {
      mongoClient = new MongoClient(uri);
      await mongoClient.connect();
      const connected = mongoClient.db(ENV.mongoDatabase || undefined);
      await Promise.all([
        connected.collection("users").createIndex({ openId: 1 }, { unique: true }),
        connected.collection("local_credentials").createIndex({ email: 1 }, { unique: true }),
        connected.collection("worker_profiles").createIndex({ userId: 1 }, { unique: true }),
        connected.collection("service_requests").createIndex({ id: 1 }, { unique: true }),
        connected.collection("service_requests").createIndex({ customerId: 1, status: 1 }),
        connected.collection("service_requests").createIndex({ workerId: 1, status: 1 }),
      ]);
      database = connected;
      return connected;
    })().catch((error) => {
      connectionPromise = null;
      mongoClient = null;
      throw error;
    });
  }

  return connectionPromise;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("MongoDB is not configured; set MONGODB_URI");
  return db;
}

async function nextId(db: Db, collectionName: string) {
  const counter = await db.collection<Counter>("counters").findOneAndUpdate(
    { _id: collectionName },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  if (!counter) throw new Error(`Could not allocate an ID for ${collectionName}`);
  return counter.value;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await requireDb();
  const users = db.collection<MongoDocument<User>>("users");
  const existing = await users.findOne({ openId: user.openId });
  const now = new Date();

  if (existing) {
    const update: Partial<User> = { updatedAt: now };
    for (const field of ["name", "email", "loginMethod", "lastSignedIn", "role", "userType"] as const) {
      if (user[field] !== undefined) update[field] = user[field] as never;
    }
    await users.updateOne({ openId: user.openId }, { $set: update });
    return;
  }

  await users.insertOne({
    id: await nextId(db, "users"),
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    userType: user.userType ?? "customer",
    createdAt: user.createdAt ?? now,
    updatedAt: now,
    lastSignedIn: user.lastSignedIn ?? now,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const user = await db.collection<MongoDocument<User>>("users").findOne({ openId });
  return user ? plain(user) : undefined;
}

export async function createLocalAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
  userType: "customer" | "worker";
  workerCategory?: string;
  neighborhood?: string;
}) {
  const db = await requireDb();
  const now = new Date();
  const user: User = {
    id: await nextId(db, "users"),
    openId: `local_${randomUUID()}`,
    name: input.name,
    email: input.email,
    loginMethod: "email",
    role: "user",
    userType: input.userType,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };

  await db.collection<MongoDocument<User>>("users").insertOne(user);
  try {
    await db.collection<LocalCredential & Document>("local_credentials").insertOne({
      userId: user.id,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: now,
    });
    if (input.userType === "worker") {
      await db.collection<MongoDocument<WorkerProfile>>("worker_profiles").insertOne({
        id: await nextId(db, "worker_profiles"),
        userId: user.id,
        displayName: input.name,
        category: input.workerCategory ?? "General services",
        bio: "Local service professional accepting community requests.",
        neighborhood: input.neighborhood ?? "Pune",
        city: "Pune",
        yearsExperience: 1,
        rating: 500,
        totalJobs: 0,
        verified: 0,
        available: 1,
        hourlyRate: 500,
        avatarUrl: null,
        skills: input.workerCategory ?? "General services",
        latitude: null,
        longitude: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (error) {
    await db.collection("local_credentials").deleteOne({ userId: user.id });
    await db.collection("worker_profiles").deleteOne({ userId: user.id });
    await db.collection<MongoDocument<User>>("users").deleteOne({ id: user.id });
    throw error;
  }
  return user;
}

export async function getLocalCredentialByEmail(email: string) {
  const db = await requireDb();
  return db.collection<LocalCredential & Document>("local_credentials").findOne({ email });
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const user = await db.collection<MongoDocument<User>>("users").findOne({ id: userId });
  return user ? plain(user) : undefined;
}

export async function listCategories() {
  const db = await getDb();
  if (!db) return demoCategories;
  const categories = await db.collection<MongoDocument<ServiceCategory>>("service_categories").find().sort({ id: 1 }).toArray();
  return categories.length ? categories.map(plain) : demoCategories;
}

export async function listWorkers(category?: string) {
  const db = await getDb();
  if (!db) return category ? demoWorkers.filter((worker) => worker.category.toLowerCase() === category.toLowerCase()) : demoWorkers;
  const filter = category ? { category } : {};
  const workers = await db.collection<MongoDocument<WorkerProfile>>("worker_profiles").find(filter).sort({ rating: -1 }).toArray();
  return workers.length ? workers.map(plain) : demoWorkers;
}

export async function createRequest(input: {
  customerId: number;
  serviceName: string;
  description: string;
  address: string;
  preferredDate: string;
  preferredTime: string;
  budget?: number;
  categoryId?: number;
}) {
  const db = await requireDb();
  const request = { id: await nextId(db, "service_requests"), workerId: null, categoryId: input.categoryId ?? null, budget: input.budget ?? null, ...input, status: "open" as const, createdAt: new Date(), updatedAt: new Date() };
  await db.collection<MongoDocument<ServiceRequest>>("service_requests").insertOne(request);
  return request;
}

export async function listRequestsForUser(userId: number, userType: "customer" | "worker" | "cooperative") {
  const db = await getDb();
  if (!db) return demoRequests;
  let filter: Filter<RequestDocument> = {};
  if (userType === "customer") {
    filter = { customerId: userId };
  } else if (userType === "worker") {
    const profile = await db.collection<MongoDocument<WorkerProfile>>("worker_profiles").findOne({ userId });
    const categoryId = demoCategories.find((category) => category.name === profile?.category)?.id;
    const assignedFilter: Filter<RequestDocument> = { workerId: userId };
    const openFilter: Filter<RequestDocument> = {
      status: "open",
      workerId: null,
      ...(categoryId ? { categoryId } : {}),
    };
    filter = profile?.available ? { $or: [assignedFilter, openFilter] } : assignedFilter;
  }
  const requests = await db.collection<RequestDocument>("service_requests").find(filter).sort({ createdAt: -1 }).toArray();
  return requests.map((request) => {
    const { workerLocation: _workerLocation, ...publicRequest } = request;
    return plain(publicRequest);
  });
}

export async function acceptRequest(id: number, workerId: number) {
  const db = await requireDb();
  const profile = await db.collection<MongoDocument<WorkerProfile>>("worker_profiles").findOne({ userId: workerId });
  if (!profile?.available) throw new Error("Set your worker profile to available before accepting requests");

  const categoryId = demoCategories.find((category) => category.name === profile.category)?.id;
  const lock = await db.collection<MongoDocument<WorkerProfile>>("worker_profiles").updateOne(
    { userId: workerId, available: 1 },
    { $set: { available: 0, updatedAt: new Date() } },
  );
  if (!lock.matchedCount) throw new Error("Your worker profile is no longer available");

  try {
    const now = new Date();
    const result = await db.collection<RequestDocument>("service_requests").updateOne(
      { id, status: "open", workerId: null, ...(categoryId ? { categoryId } : {}) },
      { $set: { workerId, status: "accepted", acceptedAt: now, updatedAt: now } },
    );
    if (!result.matchedCount) throw new Error("This request has already been accepted or is no longer available");
    const request = await db.collection<RequestDocument>("service_requests").findOne({ id });
    if (!request) throw new Error("Accepted request could not be loaded");
    return plain(request);
  } catch (error) {
    await db.collection<MongoDocument<WorkerProfile>>("worker_profiles").updateOne(
      { userId: workerId, available: 0 },
      { $set: { available: 1, updatedAt: new Date() } },
    );
    throw error;
  }
}

export async function startRequest(id: number, workerId: number, location: Omit<WorkerLocation, "updatedAt">) {
  const db = await requireDb();
  const now = new Date();
  const result = await db.collection<RequestDocument>("service_requests").updateOne(
    { id, workerId, status: "accepted" },
    { $set: { status: "in_progress", startedAt: now, workerLocation: { ...location, updatedAt: now }, updatedAt: now } },
  );
  if (!result.matchedCount) throw new Error("Only the assigned worker can start this accepted request");
  return { id, status: "in_progress" as const, workerLocation: { ...location, updatedAt: now } };
}

export async function updateWorkerLocation(id: number, workerId: number, location: Omit<WorkerLocation, "updatedAt">) {
  const db = await requireDb();
  const now = new Date();
  const result = await db.collection<RequestDocument>("service_requests").updateOne(
    { id, workerId, status: "in_progress" },
    { $set: { workerLocation: { ...location, updatedAt: now } } },
  );
  return { updatedAt: now, tracking: result.matchedCount > 0 };
}

export async function changeRequestStatus(id: number, status: "completed" | "cancelled", workerId: number) {
  const db = await requireDb();
  const fromStatus = status === "completed" ? "in_progress" : "accepted";
  const result = await db.collection<RequestDocument>("service_requests").updateOne(
    { id, workerId, status: fromStatus },
    {
      $set: { status, updatedAt: new Date(), ...(status === "completed" ? { completedAt: new Date() } : {}) },
      $unset: { workerLocation: "", ...(status === "cancelled" ? { workerId: "" } : {}) },
    },
  );
  if (!result.matchedCount) throw new Error("This job can no longer be updated by this worker");
  await db.collection<MongoDocument<WorkerProfile>>("worker_profiles").updateOne(
    { userId: workerId },
    { $set: { available: 1, updatedAt: new Date() } },
  );
  return { id, status };
}

export async function getRequestTracking(id: number, customerId: number) {
  const db = await requireDb();
  const request = await db.collection<RequestDocument>("service_requests").findOne({
    id,
    customerId,
    status: "in_progress",
    workerId: { $ne: null },
  });
  if (!request) return null;
  const worker = request.workerId === null
    ? null
    : await db.collection<MongoDocument<User>>("users").findOne({ id: request.workerId });
  return {
    requestId: request.id,
    serviceName: request.serviceName,
    address: request.address,
    workerName: worker?.name ?? "Your worker",
    location: request.workerLocation ?? null,
  };
}

export async function updateAvailability(userId: number, available: boolean) {
  const db = await requireDb();
  if (available) {
    const activeRequest = await db.collection<RequestDocument>("service_requests").findOne({
      workerId: userId,
      status: { $in: ["accepted", "in_progress"] },
    });
    if (activeRequest) throw new Error("Complete or cancel your current job before becoming available");
  }
  await db.collection<MongoDocument<WorkerProfile>>("worker_profiles").updateOne(
    { userId },
    { $set: { available: available ? 1 : 0, updatedAt: new Date() } },
  );
  return { available };
}

export async function getWorkerProfile(userId: number) {
  const db = await getDb();
  if (!db) return demoWorkers[0];
  const profile = await db.collection<MongoDocument<WorkerProfile>>("worker_profiles").findOne({ userId });
  return profile ? plain(profile) : demoWorkers[0];
}

export async function getCooperativeAnalytics() {
  const db = await getDb();
  if (!db) return { activeWorkers: 128, verifiedWorkers: 112, openRequests: 46, completedJobs: 864, monthlyVolume: 284000, satisfaction: 4.8, pendingVerifications: 7 };
  const [activeWorkers, verifiedWorkers, openRequests, completedJobs, revenue] = await Promise.all([
    db.collection("worker_profiles").countDocuments(),
    db.collection("worker_profiles").countDocuments({ verified: { $ne: 0 } }),
    db.collection("service_requests").countDocuments({ status: "open" }),
    db.collection("jobs").countDocuments({ status: "completed" }),
    db.collection<MongoDocument<Job>>("jobs").aggregate<{ total: number }>([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      { $project: { _id: 0, total: 1 } },
    ]).next(),
  ]);
  return { activeWorkers, verifiedWorkers, openRequests, completedJobs, monthlyVolume: Number(revenue?.total ?? 0), satisfaction: 4.8, pendingVerifications: 7 };
}

export async function getWorkerStats(userId: number) {
  const profile = await getWorkerProfile(userId);
  const db = await getDb();
  if (!db) return { profile, earnings: 42600, pending: 3, completed: 182, responseRate: 96 };
  const summary = await db.collection<MongoDocument<Job>>("jobs").aggregate<{ earnings: number; completed: number }>([
    { $match: { workerId: userId } },
    { $group: { _id: null, earnings: { $sum: "$totalAmount" }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } } } },
  ]).next();
  return { profile, earnings: Number(summary?.earnings ?? 0), pending: 0, completed: Number(summary?.completed ?? 0), responseRate: 96 };
}

export type { Review };