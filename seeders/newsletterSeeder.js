const mongoose = require('mongoose');
const Newsletter = require('../models/Newsletter');
const User = require('../models/User');

require('dotenv').config();

// Sample newsletter content
const sampleNewsletters = [
  {
    title: "Summer Wellness Tips: Staying Cool and Balanced",
    content: "As temperatures rise, it's important to maintain balance in our bodies and minds. According to Ayurveda, summer is dominated by Pitta dosha, which governs heat, metabolism, and transformation in the body. To stay balanced during these hot months, focus on cooling foods like cucumber, watermelon, and mint. Avoid spicy and oily foods that can aggravate Pitta. Practice early morning walks when the air is cooler, and spend time near water bodies if possible. Cooling breathing exercises like Sheetali Pranayama can help regulate body temperature and calm the mind. Remember to stay hydrated with room temperature water rather than ice-cold drinks, which can disturb digestive fire.",
    category: "seasonal",
    author: "Ayurvedic Wellness Team",
    tags: ["summer", "pitta", "cooling", "hydration", "balance"]
  },
  {
    title: "Yoga Poses for Better Sleep",
    content: "Struggling with sleepless nights? Incorporate these gentle yoga poses into your evening routine to promote relaxation and better sleep quality. Start with Balasana (Child's Pose) to calm the nervous system. Follow with Supta Baddha Konasana (Reclined Bound Angle Pose) to open the chest and relax the abdomen. Try Viparita Karani (Legs Up the Wall) to reverse blood flow and calm the mind. End with Savasana (Corpse Pose) for deep relaxation. Hold each pose for 1-3 minutes while focusing on slow, deep breaths. These poses activate the parasympathetic nervous system, preparing your body for restful sleep. Practice 1-2 hours before bedtime for optimal results.",
    category: "wellness_tips",
    author: "Wellness Coach Team",
    tags: ["yoga", "sleep", "relaxation", "poses", "evening routine"]
  },
  {
    title: "Immunity-Boosting Herbs for the Season",
    content: "Strengthen your natural defenses with these powerful Ayurvedic herbs. Ashwagandha is known as an adaptogen that helps the body resist stress and boosts immunity naturally. Turmeric contains curcumin, a powerful anti-inflammatory and antimicrobial compound. Tulsi (Holy Basil) is revered in Ayurveda for its immune-supporting and respiratory health benefits. Ginger aids digestion and has antimicrobial properties. Triphala, a combination of three fruits, supports digestive health and detoxification. Incorporate these herbs into your daily routine through teas, powders, or supplements after consulting with an Ayurvedic practitioner. Remember that prevention is better than cure, and these herbs work best when combined with a healthy lifestyle.",
    category: "general",
    author: "Herbal Medicine Experts",
    tags: ["herbs", "immunity", "ashwagandha", "turmeric", "tulsi", "triophala"]
  },
  {
    title: "Mindful Eating: The Ayurvedic Way",
    content: "Ayurveda emphasizes the importance of mindful eating for optimal digestion and health. Eat in a calm, peaceful environment without distractions like TV or phones. Chew your food thoroughly to aid digestion and allow your brain to register satiation. Eat warm, freshly prepared meals as cold foods can dampen digestive fire. Include all six tastes (sweet, sour, salty, pungent, bitter, astringent) in each meal to ensure nutritional completeness. Drink warm water or herbal teas during meals to support digestion. Pay attention to how different foods make you feel and adjust your diet accordingly. The stomach should be filled half with food, one quarter with water, and one quarter left empty for proper digestion.",
    category: "wellness_tips",
    author: "Nutrition Specialists",
    tags: ["mindful eating", "digestion", "ayurveda", "diet", "nutrition"]
  },
  {
    title: "Seasonal Detox: Spring Cleansing Rituals",
    content: "Spring is the perfect time for gentle detoxification as the body naturally seeks to eliminate winter accumulations. Start your day with warm lemon water to stimulate digestion and liver function. Incorporate detoxifying foods like leafy greens, beets, and artichokes into your diet. Reduce heavy, oily, and sweet foods that can contribute to sluggishness. Practice dry brushing to stimulate lymphatic circulation. Include gentle exercise like walking or yoga to promote circulation and elimination. Consider intermittent fasting, such as having dinner early and breakfast late, to give your digestive system a rest. Add detoxifying herbs like dandelion root and milk thistle to support liver function. Listen to your body and detox gently, as aggressive cleansing can be counterproductive.",
    category: "specific_condition",
    author: "Detox Experts",
    tags: ["spring", "detox", "cleansing", "fasting", "liver", "lymphatic"]
  }
];

async function seedNewsletters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/herbtrade');
    
    console.log('Connected to MongoDB');
    
    // Clear existing newsletters
    await Newsletter.deleteMany({});
    console.log('Cleared existing newsletters');
    
    // Create newsletters
    for (const newsletterData of sampleNewsletters) {
      const newsletter = new Newsletter(newsletterData);
      await newsletter.save();
      console.log(`Created newsletter: ${newsletter.title}`);
    }
    
    console.log('Newsletters seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding newsletters:', error);
    process.exit(1);
  }
}

seedNewsletters();