const express = require('express');
const Product = require('../models/Product');
const Hospital = require('../models/Hospital');
const router = express.Router();

const herbalKnowledge = {
  herbs: {
    'tulsi': {
      name: 'Tulsi (Holy Basil)',
      uses: ['immunity booster', 'respiratory health', 'stress relief', 'fever reduction', 'cough', 'cold'],
      properties: 'Adaptogenic, antimicrobial, anti-inflammatory, expectorant',
      dosage: '2-3 leaves daily or 1 tsp powder with warm water',
      precautions: 'Generally safe, avoid during pregnancy',
      benefits: 'Boosts immunity, reduces stress, fights infections, improves respiratory health'
    },
    'ashwagandha': {
      name: 'Ashwagandha (Winter Cherry)',
      uses: ['stress relief', 'energy boost', 'sleep improvement', 'muscle strength', 'anxiety', 'fatigue'],
      properties: 'Adaptogenic, anti-anxiety, anti-inflammatory, rejuvenative',
      dosage: '300-600mg daily with meals or warm milk',
      precautions: 'Avoid with autoimmune conditions, pregnancy, and thyroid medications',
      benefits: 'Reduces cortisol levels, improves strength, enhances sleep quality, boosts energy'
    },
    'neem': {
      name: 'Neem (Margosa)',
      uses: ['skin care', 'detoxification', 'blood purification', 'dental health', 'acne', 'eczema'],
      properties: 'Antibacterial, antifungal, anti-inflammatory, blood purifier',
      dosage: '2-4 leaves daily or 500mg capsules twice daily',
      precautions: 'Avoid during pregnancy, may lower blood sugar',
      benefits: 'Purifies blood, treats skin conditions, supports oral health, natural pesticide'
    },
    'brahmi': {
      name: 'Brahmi (Bacopa Monnieri)',
      uses: ['memory enhancement', 'cognitive function', 'anxiety relief', 'hair growth', 'concentration'],
      properties: 'Nootropic, adaptogenic, antioxidant, nervine tonic',
      dosage: '300-600mg daily or 1 tsp powder with ghee',
      precautions: 'May cause drowsiness, start with low dose',
      benefits: 'Enhances memory, reduces anxiety, improves focus, promotes hair growth'
    },
    'turmeric': {
      name: 'Turmeric (Haldi)',
      uses: ['anti-inflammatory', 'joint health', 'digestive health', 'wound healing', 'arthritis'],
      properties: 'Anti-inflammatory, antioxidant, antimicrobial, hepatoprotective',
      dosage: '1-3g daily with black pepper and fat for absorption',
      precautions: 'May increase bleeding risk, avoid with gallstones',
      benefits: 'Reduces inflammation, supports joint health, aids digestion, heals wounds'
    },
    'ginger': {
      name: 'Ginger (Adrak)',
      uses: ['nausea relief', 'digestive health', 'inflammation reduction', 'cold relief', 'motion sickness'],
      properties: 'Anti-nausea, anti-inflammatory, warming, digestive stimulant',
      dosage: '1-4g daily, fresh or dried',
      precautions: 'May increase bleeding risk, avoid with gallstones',
      benefits: 'Relieves nausea, improves digestion, reduces inflammation, warms the body'
    },
    'amla': {
      name: 'Amla (Indian Gooseberry)',
      uses: ['immunity', 'hair health', 'skin health', 'vitamin C', 'antioxidant'],
      properties: 'High in Vitamin C, antioxidant, rejuvenative, immunomodulator',
      dosage: '1-2 fresh fruits daily or 500mg powder',
      precautions: 'Generally safe, may cause acidity in some people',
      benefits: 'Boosts immunity, promotes hair growth, anti-aging, rich in Vitamin C'
    },
    'giloy': {
      name: 'Giloy (Guduchi)',
      uses: ['immunity', 'fever', 'diabetes', 'arthritis', 'liver health'],
      properties: 'Immunomodulator, antipyretic, hepatoprotective, anti-inflammatory',
      dosage: '1-3g powder daily or fresh juice',
      precautions: 'May lower blood sugar, consult doctor if diabetic',
      benefits: 'Enhances immunity, reduces fever, supports liver health, anti-diabetic'
    },
    'triphala': {
      name: 'Triphala',
      uses: ['digestion', 'detox', 'constipation', 'eye health', 'weight management'],
      properties: 'Digestive, laxative, antioxidant, rejuvenative',
      dosage: '1-2g powder with warm water before bed',
      precautions: 'May cause loose stools initially, avoid during pregnancy',
      benefits: 'Improves digestion, gentle detox, supports eye health, aids weight loss'
    },
    'fenugreek': {
      name: 'Fenugreek (Methi)',
      uses: ['diabetes', 'lactation', 'hair loss', 'cholesterol', 'digestion'],
      properties: 'Hypoglycemic, galactagogue, anti-inflammatory, digestive',
      dosage: '1-2g seeds soaked overnight or powder',
      precautions: 'May lower blood sugar, avoid during pregnancy',
      benefits: 'Controls blood sugar, increases milk production, reduces hair loss'
    }
  },

  conditions: {
    'cold': ['ginger', 'tulsi', 'turmeric', 'honey', 'black pepper'],
    'flu': ['tulsi', 'ginger', 'turmeric', 'giloy', 'amla'],
    'cough': ['tulsi', 'ginger', 'honey', 'black pepper', 'licorice'],
    'stress': ['ashwagandha', 'brahmi', 'tulsi', 'jatamansi'],
    'anxiety': ['ashwagandha', 'brahmi', 'tulsi', 'shankhpushpi'],
    'depression': ['brahmi', 'ashwagandha', 'tulsi', 'jatamansi'],
    'skin problems': ['neem', 'turmeric', 'aloe vera', 'manjistha'],
    'acne': ['neem', 'turmeric', 'aloe vera', 'tea tree oil'],
    'eczema': ['neem', 'turmeric', 'coconut oil', 'aloe vera'],
    'digestive issues': ['ginger', 'turmeric', 'fennel', 'triphala'],
    'constipation': ['triphala', 'isabgol', 'castor oil', 'aloe vera'],
    'indigestion': ['ginger', 'fennel', 'ajwain', 'mint'],
    'memory problems': ['brahmi', 'shankhpushpi', 'mandukaparni', 'almonds'],
    'concentration': ['brahmi', 'shankhpushpi', 'gotu kola', 'rosemary'],
    'immunity': ['tulsi', 'turmeric', 'amla', 'giloy', 'ashwagandha'],
    'diabetes': ['fenugreek', 'bitter gourd', 'jamun', 'giloy'],
    'high blood pressure': ['arjuna', 'garlic', 'hibiscus', 'ashwagandha'],
    'arthritis': ['turmeric', 'ginger', 'boswellia', 'guggul'],
    'joint pain': ['turmeric', 'ginger', 'ashwagandha', 'nirgundi'],
    'hair loss': ['brahmi', 'bhringraj', 'amla', 'fenugreek', 'curry leaves'],
    'dandruff': ['neem', 'tea tree oil', 'fenugreek', 'lemon'],
    'insomnia': ['ashwagandha', 'brahmi', 'jatamansi', 'chamomile'],
    'fatigue': ['ashwagandha', 'ginseng', 'rhodiola', 'tulsi'],
    'weight loss': ['triphala', 'guggul', 'garcinia', 'green tea'],
    'liver problems': ['milk thistle', 'turmeric', 'giloy', 'bhumi amla']
  },

  seasonal: {
    'summer': ['amla', 'aloe vera', 'mint', 'coriander', 'fennel'],
    'winter': ['ginger', 'turmeric', 'ashwagandha', 'chyawanprash'],
    'monsoon': ['tulsi', 'ginger', 'turmeric', 'neem', 'giloy'],
    'spring': ['neem', 'turmeric', 'triphala', 'bitter gourd']
  }
};

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userMessage = message.toLowerCase().trim();
    let response = '';

    if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
      response = "Hello! 🌿 I'm HerbBot, your herbal medicine assistant. I can help you with:\n\n• Information about herbs and their uses\n• Health conditions and natural remedies\n• Product recommendations\n• Hospital locations\n• Dosage and safety information\n\nWhat would you like to know?";
    }
    
    else if (userMessage.includes('help')) {
      response = "I can assist you with:\n\n🌱 **Herb Information**: Ask about specific herbs like 'tell me about tulsi'\n💊 **Health Conditions**: Ask 'what herbs help with stress?'\n🛒 **Products**: Ask 'show me turmeric products'\n🏥 **Hospitals**: Ask 'find hospitals near me'\n⚠️ **Safety**: Ask 'is ashwagandha safe?'\n\nJust type your question naturally!";
    }
    
    else if (userMessage.includes('tell me about') || userMessage.includes('what is') || userMessage.includes('benefits of')) {
      const herbName = extractHerbName(userMessage);
      if (herbName && herbalKnowledge.herbs[herbName]) {
        const herb = herbalKnowledge.herbs[herbName];
        response = `🌿 **${herb.name}**\n\n**Key Benefits**: ${herb.benefits}\n\n**Uses**: ${herb.uses.join(', ')}\n\n**Properties**: ${herb.properties}\n\n**Recommended Dosage**: ${herb.dosage}\n\n**⚠️ Precautions**: ${herb.precautions}\n\n💡 **Tip**: Always consult with a healthcare provider before starting any herbal regimen.\n\nWould you like to see available ${herb.name} products or learn about similar herbs?`;
      } else {
        response = "I don't have detailed information about that specific herb in my current database. However, I can help you with:\n\n• Popular herbs like Tulsi, Ashwagandha, Turmeric, Neem, Brahmi\n• Finding products in our catalog\n• Connecting you with herbal specialists\n\nWhat specific health concern are you looking to address? I might be able to suggest suitable alternatives!";
      }
    }
    
    else if (userMessage.includes('help with') || userMessage.includes('good for') || userMessage.includes('treat') || userMessage.includes('cure') || userMessage.includes('remedy')) {
      const condition = extractCondition(userMessage);
      console.log('Extracted condition:', condition);
      if (condition && herbalKnowledge.conditions[condition]) {
        const herbs = herbalKnowledge.conditions[condition];
        response = `🌿 **Natural Remedies for ${condition.charAt(0).toUpperCase() + condition.slice(1)}**\n\nTraditionally used herbs:\n${herbs.map(herb => `• **${herb.charAt(0).toUpperCase() + herb.slice(1)}** - ${herbalKnowledge.herbs[herb]?.benefits || 'Traditional remedy'}`).join('\n')}\n\n💡 **Holistic Approach**:\n• Combine with proper diet and lifestyle\n• Stay hydrated and get adequate rest\n• Consider stress management techniques\n\n⚠️ **Important**: These are traditional uses based on Ayurvedic principles. For serious or persistent conditions, please consult a qualified healthcare provider.\n\nWould you like detailed information about any specific herb or see available products?`;
      } else {
        response = `I'd be happy to help you find natural remedies! I can provide information about herbs for:\n\n🔹 **Common Issues**: Cold, flu, cough, stress, anxiety\n🔹 **Digestive Health**: Indigestion, constipation, acidity\n🔹 **Skin Care**: Acne, eczema, dry skin\n🔹 **Mental Health**: Memory, concentration, sleep\n🔹 **General Wellness**: Immunity, energy, detox\n\nCould you be more specific about what you're looking to address?`;
      }
    }
    
    else if (userMessage.includes('season') || userMessage.includes('summer') || userMessage.includes('winter') || userMessage.includes('monsoon') || userMessage.includes('spring')) {
      const season = extractSeason(userMessage);
      if (season && herbalKnowledge.seasonal[season]) {
        const herbs = herbalKnowledge.seasonal[season];
        response = `🌿 **${season.charAt(0).toUpperCase() + season.slice(1)} Herbal Recommendations**\n\nBest herbs for this season:\n${herbs.map(herb => `• **${herb.charAt(0).toUpperCase() + herb.slice(1)}** - ${herbalKnowledge.herbs[herb]?.benefits || 'Seasonal benefit'}`).join('\n')}\n\n🌡️ **Why these herbs?**\n${getSeasonalAdvice(season)}\n\nWould you like detailed information about any of these herbs?`;
      } else {
        response = "I can provide seasonal herbal recommendations! Each season requires different herbs to maintain balance:\n\n🌞 **Summer**: Cooling herbs like Amla, Aloe Vera\n❄️ **Winter**: Warming herbs like Ginger, Ashwagandha\n🌧️ **Monsoon**: Immunity boosters like Tulsi, Giloy\n🌸 **Spring**: Detoxifying herbs like Neem, Triphala\n\nWhich season are you interested in?";
      }
    }
    
    else if (userMessage.includes('product') || userMessage.includes('buy') || userMessage.includes('price')) {
      const herbName = extractHerbName(userMessage);
      if (herbName) {
        const products = await Product.find({
          $or: [
            { name: { $regex: herbName, $options: 'i' } },
            { description: { $regex: herbName, $options: 'i' } }
          ]
        }).limit(3);

        if (products.length > 0) {
          response = `🛒 **${herbName.charAt(0).toUpperCase() + herbName.slice(1)} Products Available:**\n\n`;
          products.forEach(product => {
            response += `• **${product.name}** - ₹${product.price}\n  ${product.description}\n  Quality: ${product.quality}\n\n`;
          });
          response += "Visit our herb catalog to see all available products and place orders!";
        } else {
          response = `I couldn't find any ${herbName} products in our current inventory. You can check our herb catalog for the latest products or contact our sellers directly.`;
        }
      } else {
        response = "Which herb product are you looking for? I can help you find turmeric, ashwagandha, tulsi, neem, brahmi, and many other herbal products!";
      }
    }
    
    else if (userMessage.includes('hospital') || userMessage.includes('doctor') || userMessage.includes('clinic')) {
      response = "🏥 **Hospital Information**\n\nI can help you find:\n• Ayurvedic hospitals and clinics\n• Herbal medicine specialists\n• Integrative medicine centers\n\nFor the best results, please visit our Hospital Discovery page where you can:\n• Search by location\n• Filter by specialty\n• View doctor information\n• Get directions\n\nWould you like me to provide information about a specific type of treatment?";
    }
    
    else if (userMessage.includes('safe') || userMessage.includes('side effect') || userMessage.includes('dosage')) {
      response = "⚠️ **Safety Information**\n\nHerbal medicines can be very effective but should be used responsibly:\n\n• **Always consult** a qualified healthcare provider\n• **Start with low doses** to test tolerance\n• **Check for interactions** with medications\n• **Avoid during pregnancy/nursing** unless approved\n• **Buy from reputable sources** only\n\nFor specific safety information about any herb, please ask about that particular herb, and I'll provide detailed precautions!";
    }
    
    else {
      const condition = extractCondition(userMessage);
      if (condition && herbalKnowledge.conditions[condition]) {
        const herbs = herbalKnowledge.conditions[condition];
        response = `🌿 **Natural Remedies for ${condition.charAt(0).toUpperCase() + condition.slice(1)}**\n\nTraditionally used herbs:\n${herbs.map(herb => `• **${herb.charAt(0).toUpperCase() + herb.slice(1)}** - ${herbalKnowledge.herbs[herb]?.benefits || 'Traditional remedy'}`).join('\n')}\n\n💡 **Holistic Approach**:\n• Combine with proper diet and lifestyle\n• Stay hydrated and get adequate rest\n• Consider stress management techniques\n\n⚠️ **Important**: These are traditional uses based on Ayurvedic principles. For serious or persistent conditions, please consult a qualified healthcare provider.\n\nWould you like detailed information about any specific herb or see available products?`;
      } else {
        response = "I'm here to help with herbal medicine questions! You can ask me about:\n\n🌿 **Specific herbs**: 'tell me about turmeric', 'benefits of ashwagandha'\n💊 **Health conditions**: 'help with stress', 'remedies for cold'\n🛒 **Products**: 'show me turmeric products', 'ashwagandha price'\n🏥 **Hospitals**: 'find hospitals near me', 'ayurvedic doctors'\n⚠️ **Safety**: 'is neem safe?', 'turmeric dosage'\n🌡️ **Seasonal**: 'herbs for summer', 'winter remedies'\n\nWhat would you like to know?";
      }
    }

    res.json({ 
      response,
      timestamp: new Date().toISOString(),
      type: 'text'
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ 
      error: 'Sorry, I encountered an error. Please try again.',
      response: "I'm experiencing some technical difficulties. Please try asking your question again, or visit our herb catalog and hospital discovery pages for more information."
    });
  }
});

function extractHerbName(message) {
  const herbs = Object.keys(herbalKnowledge.herbs);
  for (const herb of herbs) {
    if (message.includes(herb)) {
      return herb;
    }
  }
  return null;
}

function extractCondition(message) {
  if (message.includes('anxiety') || message.includes('tension') || message.includes('worried') || message.includes('stress')) return 'stress';
  if (message.includes('flu') || message.includes('fever') || message.includes('runny nose') || message.includes('cold')) return 'cold';
  if (message.includes('acne') || message.includes('rash') || message.includes('pimples') || message.includes('skin')) return 'skin problems';
  if (message.includes('stomach') || message.includes('bloating') || message.includes('gas') || message.includes('digest')) return 'digestive issues';
  if (message.includes('focus') || message.includes('brain fog') || message.includes('forgetful') || message.includes('memory')) return 'memory problems';
  if (message.includes('immune') || message.includes('defense') || message.includes('resistance') || message.includes('immunity')) return 'immunity';
  if (message.includes('sleep') || message.includes('insomnia') || message.includes('restless')) return 'insomnia';
  if (message.includes('tired') || message.includes('exhausted') || message.includes('fatigue')) return 'fatigue';
  if (message.includes('weight') || message.includes('fat') || message.includes('obesity')) return 'weight loss';
  if (message.includes('sugar') || message.includes('diabetic') || message.includes('glucose') || message.includes('diabetes')) return 'diabetes';
  if (message.includes('pressure') || message.includes('hypertension') || message.includes('bp')) return 'high blood pressure';
  if (message.includes('joint') || message.includes('knee pain') || message.includes('back pain') || message.includes('arthritis')) return 'joint pain';
  if (message.includes('hair fall') || message.includes('baldness') || message.includes('thinning hair') || message.includes('hair loss')) return 'hair loss';
  if (message.includes('cough') || message.includes('throat')) return 'cough';
  if (message.includes('constipation') || message.includes('bowel')) return 'constipation';
  if (message.includes('indigestion') || message.includes('acidity')) return 'indigestion';
  if (message.includes('concentration') || message.includes('focus')) return 'concentration';
  if (message.includes('dandruff') || message.includes('scalp')) return 'dandruff';
  if (message.includes('liver') || message.includes('hepatic')) return 'liver problems';
  
  const conditions = Object.keys(herbalKnowledge.conditions);
  for (const condition of conditions) {
    if (message.includes(condition)) {
      return condition;
    }
  }
  
  return null;
}

function extractSeason(message) {
  if (message.includes('summer') || message.includes('hot') || message.includes('heat')) return 'summer';
  if (message.includes('winter') || message.includes('cold weather') || message.includes('chilly')) return 'winter';
  if (message.includes('monsoon') || message.includes('rainy') || message.includes('humid')) return 'monsoon';
  if (message.includes('spring') || message.includes('pleasant weather')) return 'spring';
  return null;
}

function getSeasonalAdvice(season) {
  const advice = {
    'summer': 'These cooling herbs help balance the heat and prevent dehydration, acidity, and heat-related disorders.',
    'winter': 'These warming herbs boost immunity, improve circulation, and help the body adapt to cold weather.',
    'monsoon': 'These herbs strengthen immunity and help prevent infections common during humid, rainy weather.',
    'spring': 'These detoxifying herbs help cleanse the body after winter and prepare for the warmer months ahead.'
  };
  return advice[season] || 'These herbs are traditionally recommended for this season.';
}

router.get('/herbs/:herbName', (req, res) => {
  try {
    const herbName = req.params.herbName.toLowerCase();
    const herb = herbalKnowledge.herbs[herbName];
    
    if (herb) {
      res.json(herb);
    } else {
      res.status(404).json({ error: 'Herb information not found' });
    }
  } catch (error) {
    console.error('Error fetching herb info:', error);
    res.status(500).json({ error: 'Failed to fetch herb information' });
  }
});

router.get('/herbs', (req, res) => {
  try {
    const herbs = Object.keys(herbalKnowledge.herbs).map(key => ({
      key,
      name: herbalKnowledge.herbs[key].name,
      uses: herbalKnowledge.herbs[key].uses
    }));
    
    res.json(herbs);
  } catch (error) {
    console.error('Error fetching herbs:', error);
    res.status(500).json({ error: 'Failed to fetch herbs' });
  }
});

module.exports = router;