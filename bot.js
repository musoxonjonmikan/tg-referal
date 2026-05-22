import { Telegraf } from 'telegraf';
import { User } from './db.js';

const ADMIN_ID = 5523761749;
const BOT_USERNAME = 'vaelux_bot';

// Channel IDs and info
const CHANNELS = {
  vaelux: {
    id: -1001860340485,
    username: 'vaelux',
    name: '@vaelux',
  },
  multilevel: {
    id: -1003947616006,
    username: 'vaelux_multilevel',
    name: 'Multilevel kursga qo\'shilish',
    joinLink: 'https://t.me/+WuxE-3AVX_VmOGY6',
  },
  math: {
    id: -1003975469421,
    username: 'vaelux_math',
    name: 'Matematika materiallariga qo\'shilish',
    joinLink: 'https://t.me/+U3Re7CPYy7U2NmRi',
  },
};

export function setupBotHandlers(bot) {
  // Start command
  bot.command('start', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const firstName = ctx.from.first_name || 'Do\'stim';
      const refParam = ctx.payload;

      // Handle referral parameter
      if (refParam && refParam.startsWith('ref_')) {
        const referrerId = parseInt(refParam.split('_')[1]);

        if (referrerId === userId) {
          return ctx.reply(
            '❌ O\'zingizni o\'zingiz taklif qila olmaysiz! Boshqa do\'stlaringizni taklif qiling.'
          );
        }

        try {
          const referrer = await User.findOne({ userId: referrerId });
          if (!referrer) {
            return ctx.reply(
              '⚠️ Taklif qilgan shaxs topilmadi. Iltimos, qayta urinib ko\'ring.'
            );
          }
        } catch (error) {
          console.error('Referrer lookup error:', error);
        }
      }

      // Check if user exists
      let user = await User.findOne({ userId });

      if (!user) {
        // New user
        user = new User({
          userId,
          firstName,
          username: ctx.from.username,
          referredBy: refParam && refParam.startsWith('ref_')
            ? parseInt(refParam.split('_')[1])
            : null,
        });
        await user.save();

        // Increment referrer's count
        if (user.referredBy) {
          await User.findOneAndUpdate(
            { userId: user.referredBy },
            { $inc: { referrals: 1 } },
            { new: true }
          );
        }
      }

      // Send welcome message with join request info
      await ctx.reply(
        `👋 Assalamu alaykum, ${firstName}!\n\n🎉 Konkursimizga xush kelibsiz!\n\n📱 Quyidagi kanallarga <b>QO'SHILISH UCHUN YUBORIM</b> jo'nating va keyin tekshiring!`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📢 @vaelux (avtomatik kirish)',
                  url: 'https://t.me/vaelux',
                },
              ],
              [
                {
                  text: '📚 Multilevel kursga YUBORIM',
                  url: 'https://t.me/+WuxE-3AVX_VmOGY6',
                },
              ],
              [
                {
                  text: '📐 Matematika YUBORIM',
                  url: 'https://t.me/+U3Re7CPYy7U2NmRi',
                },
              ],
              [
                {
                  text: '✅ Obuna tekshirish',
                  callback_data: 'check_subscription',
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      console.error('Start command error:', error);
      ctx.reply(
        '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
      );
    }
  });

  // Handle chat join requests (when user sends join request)
  bot.on('chat_join_request', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const chatId = ctx.chatJoinRequest.chat.id;

      console.log(`📝 User ${userId} sent join request to channel ${chatId}`);

      // Auto-approve join request
      await ctx.approveChatJoinRequest(userId);
      console.log(`✅ Auto-approved join request for user ${userId} to channel ${chatId}`);

      // Update user record
      let user = await User.findOne({ userId });
      if (!user) {
        user = new User({
          userId,
          firstName: ctx.from.first_name || 'Do\'stim',
          username: ctx.from.username,
        });
      }

      // Mark which channel they joined
      if (chatId === CHANNELS.vaelux.id) {
        if (!user.channelsJoined) user.channelsJoined = {};
        user.channelsJoined.channel1 = true;
        console.log(`✅ User ${userId} marked as joined @vaelux`);
      } else if (chatId === CHANNELS.multilevel.id) {
        if (!user.channelsJoined) user.channelsJoined = {};
        user.channelsJoined.channel2 = true;
        console.log(`✅ User ${userId} marked as joined Multilevel`);
      } else if (chatId === CHANNELS.math.id) {
        if (!user.channelsJoined) user.channelsJoined = {};
        user.channelsJoined.channel3 = true;
        console.log(`✅ User ${userId} marked as joined Math`);
      }

      await user.save();
    } catch (error) {
      console.error('Chat join request error:', error);
    }
  });

  // Check subscription
  bot.action('check_subscription', async (ctx) => {
    try {
      const userId = ctx.from.id;
      let user = await User.findOne({ userId });

      if (!user) {
        user = new User({
          userId,
          firstName: ctx.from.first_name || 'Do\'stim',
          username: ctx.from.username,
        });
        await user.save();
      }

      // Check all channels for actual membership
      const checks = await Promise.all([
        checkUserInChannel(ctx.telegram, userId, CHANNELS.vaelux.id),
        checkUserInChannel(ctx.telegram, userId, CHANNELS.multilevel.id),
        checkUserInChannel(ctx.telegram, userId, CHANNELS.math.id),
      ]);

      const [inVaelux, inMultilevel, inMath] = checks;

      if (inVaelux && inMultilevel && inMath) {
        // All channels joined
        user.joined = true;
        user.channelsJoined = {
          channel1: true,
          channel2: true,
          channel3: true,
        };
        await user.save();

        // Generate referral link
        const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;

        await ctx.answerCbQuery('✅ Barcha kanallar tekshirildi!', false);
        await ctx.editMessageText(
          `🎊 Tabriklaymiz! Siz barcha kanalga a'zo bo\'ldingiz!\n\n👥 Endi o\'z referral havolangizni ulashing va do\'stlarni taklif qiling:\n\n🔗 <code>${referralLink}</code>\n\n<i>Havolani nusxalang va do'stlaringizga yuboring!</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '👥 Mening referrallarim',
                    callback_data: 'my_referrals',
                  },
                ],
                [
                  {
                    text: '🔄 Qayta tekshirish',
                    callback_data: 'check_subscription',
                  },
                ],
              ],
            },
          }
        );
      } else {
        // Not all channels joined
        const missing = [];
        if (!inVaelux) missing.push('@vaelux');
        if (!inMultilevel) missing.push('Multilevel kurs');
        if (!inMath) missing.push('Matematika materiallari');

        await ctx.answerCbQuery(
          '⚠️ Hamma kanallarga a\'zo bo\'lmadingiz!',
          false
        );
        await ctx.editMessageText(
          `⚠️ <b>Quyidagi kanallarga hali a'zo bo\'lmadingiz:</b>\n\n• ${missing.join('\n• ')}\n\n🔗 Iltimos, a'zo bo\'ling va qayta tekshiring!`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '📢 @vaelux',
                    url: 'https://t.me/vaelux',
                  },
                ],
                [
                  {
                    text: '📚 Multilevel kurs',
                    url: 'https://t.me/+WuxE-3AVX_VmOGY6',
                  },
                ],
                [
                  {
                    text: '📐 Matematika',
                    url: 'https://t.me/+U3Re7CPYy7U2NmRi',
                  },
                ],
                [
                  {
                    text: '✅ Qayta tekshirish',
                    callback_data: 'check_subscription',
                  },
                ],
              ],
            },
          }
        );
      }
    } catch (error) {
      console.error('Check subscription error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi', true);
    }
  });

  // My referrals
  bot.action('my_referrals', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        return ctx.answerCbQuery('❌ Sizni topa olmadim', true);
      }

      const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
      const remaining = Math.max(0, 5 - user.referrals);
      const rewardMessage =
        user.referrals >= 5 && user.rewardCount === 0
          ? '\n\n🎁 Siz mukofot olishga tayyor bo\'ldingiz! "TANLASH" tugmasini bosing!'
          : user.referrals >= 5 && user.rewardCount > 0 && user.referrals < 10
            ? `\n\n⏳ Siz allaqachon 1 ta reward oldingiz. Yana ${10 - user.referrals} referral kerak!`
            : '';

      await ctx.answerCbQuery();
      await ctx.editMessageText(
        `👥 <b>Sizning statistikangiz:</b>\n\n` +
        `📊 Jami referrallar: <b>${user.referrals}</b>\n` +
        `🎯 Kerak qolgan: <b>${Math.max(0, 5 - user.referrals)}</b>\n\n` +
        `🔗 Sizning havola:\n<code>${referralLink}</code>${rewardMessage}`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              ...(user.referrals >= 5 && user.rewardCount === 0
                ? [[{ text: '🎁 TANLASH', callback_data: 'claim_reward' }]]
                : []),
              [
                {
                  text: '🔄 Qayta tekshirish',
                  callback_data: 'check_subscription',
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      console.error('My referrals error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi', true);
    }
  });

  // Claim reward
  bot.action('claim_reward', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        return ctx.answerCbQuery('❌ Sizni topa olmadim', true);
      }

      if (user.referrals < 5) {
        return ctx.answerCbQuery(
          `⚠️ Hali ${5 - user.referrals} referral kerak!`,
          true
        );
      }

      if (user.rewardCount > 0 && user.referrals < 10) {
        return ctx.answerCbQuery(
          `⏳ Siz allaqachon reward oldingiz. Yana ${10 - user.referrals} referral kerak!`,
          true
        );
      }

      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '🎁 <b>Mukofotni tanlang:</b>\n\n• Qaysi kanalni tanlaysiz?',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📐 Matematika MILLIY',
                  callback_data: 'reward_math',
                },
              ],
              [
                {
                  text: '🌐 English Multilevel',
                  callback_data: 'reward_english',
                },
              ],
              [
                {
                  text: '◀️ Orqaga',
                  callback_data: 'my_referrals',
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      console.error('Claim reward error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi', true);
    }
  });

  // Reward Math
  bot.action('reward_math', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        return ctx.answerCbQuery('❌ Sizni topa olmadim', true);
      }

      if (user.referrals < 5) {
        return ctx.answerCbQuery(
          `⚠️ Hali ${5 - user.referrals} referral kerak!`,
          true
        );
      }

      try {
        // Create one-time invite link for Math channel
        const inviteLink = await ctx.telegram.createChatInviteLink(
          CHANNELS.math.id,
          {
            expire_date: Math.floor(Date.now() / 1000) + 3600, // 1 hour validity
            member_limit: 1,
          }
        );

        // Update user
        user.rewardCount += 1;
        user.lastRewardType = 'math';
        if (user.referrals >= 10) {
          user.rewardCount = 0;
        }
        await user.save();

        await ctx.answerCbQuery('✅ Havola tayyorlandi!', false);
        await ctx.editMessageText(
          `🎊 <b>Tabriklaymiz!</b>\n\n` +
          `📐 <b>Matematika MILLIY</b> kanalining havola:\n\n` +
          `<code>${inviteLink.invite_link}</code>\n\n` +
          `<i>Ushbu havola 1 soat davomida amal qiladi!</i>\n\n` +
          `👤 Faqat siz uchun yaratilgan maxsus havola!`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '👥 Mening referrallarim',
                    callback_data: 'my_referrals',
                  },
                ],
              ],
            },
          }
        );
      } catch (error) {
        console.error('Math invite link error:', error);
        ctx.answerCbQuery('⚠️ Havola yaratishda xatolik', true);
      }
    } catch (error) {
      console.error('Reward math error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi', true);
    }
  });

  // Reward English
  bot.action('reward_english', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        return ctx.answerCbQuery('❌ Sizni topa olmadim', true);
      }

      if (user.referrals < 5) {
        return ctx.answerCbQuery(
          `⚠️ Hali ${5 - user.referrals} referral kerak!`,
          true
        );
      }

      try {
        // Create one-time invite link for English channel
        const inviteLink = await ctx.telegram.createChatInviteLink(
          CHANNELS.multilevel.id,
          {
            expire_date: Math.floor(Date.now() / 1000) + 3600, // 1 hour validity
            member_limit: 1,
          }
        );

        // Update user
        user.rewardCount += 1;
        user.lastRewardType = 'english';
        if (user.referrals >= 10) {
          user.rewardCount = 0;
        }
        await user.save();

        await ctx.answerCbQuery('✅ Havola tayyorlandi!', false);
        await ctx.editMessageText(
          `🎊 <b>Tabriklaymiz!</b>\n\n` +
          `🌐 <b>English Multilevel</b> kanalining havola:\n\n` +
          `<code>${inviteLink.invite_link}</code>\n\n` +
          `<i>Ushbu havola 1 soat davomida amal qiladi!</i>\n\n` +
          `👤 Faqat siz uchun yaratilgan maxsus havola!`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '👥 Mening referrallarim',
                    callback_data: 'my_referrals',
                  },
                ],
              ],
            },
          }
        );
      } catch (error) {
        console.error('English invite link error:', error);
        ctx.answerCbQuery('⚠️ Havola yaratishda xatolik', true);
      }
    } catch (error) {
      console.error('Reward english error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi', true);
    }
  });

  // Admin panel
  bot.command('panel', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.reply('❌ Sizga bu buyruq ruxsat emas.');
    }

    await ctx.reply(
      '🛠️ <b>Admin Panel</b>\n\nQuyidagi buyruqlardan foydalaning:',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '👥 Foydalanuvchilar soni',
                callback_data: 'admin_users',
              },
            ],
            [
              {
                text: '📨 Xabar yuborish',
                callback_data: 'admin_broadcast',
              },
            ],
          ],
        },
      }
    );
  });

  // Admin - Users count
  bot.action('admin_users', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCbQuery('❌ Ruxsat yo\'q', true);
    }

    try {
      const totalUsers = await User.countDocuments();
      const joinedUsers = await User.countDocuments({ joined: true });
      const referralsData = await User.aggregate([
        {
          $group: {
            _id: null,
            totalReferrals: { $sum: '$referrals' },
          },
        },
      ]);

      const totalReferrals =
        referralsData.length > 0 ? referralsData[0].totalReferrals : 0;

      await ctx.answerCbQuery();
      await ctx.editMessageText(
        `📊 <b>Bot Statistikasi:</b>\n\n` +
        `👥 Jami foydalanuvchilar: <b>${totalUsers}</b>\n` +
        `✅ Tasdiqlangan foydalanuvchilar: <b>${joinedUsers}</b>\n` +
        `📈 Jami referrallar: <b>${totalReferrals}</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '◀️ Orqaga',
                  callback_data: 'admin_back',
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      console.error('Admin users error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi', true);
    }
  });

  // Admin - Broadcast
  bot.action('admin_broadcast', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCbQuery('❌ Ruxsat yo\'q', true);
    }

    await ctx.answerCbQuery();
    await ctx.reply(
      '📨 Xabar matnini yuboring (HTML formatida qabul qiladi):',
      {
        reply_markup: {
          force_reply: true,
        },
      }
    );

    bot.on('text', async (ctx) => {
      if (ctx.from.id !== ADMIN_ID || !ctx.message.reply_to_message) {
        return;
      }

      try {
        const message = ctx.message.text;
        const users = await User.find({ joined: true });
        let sent = 0;
        let failed = 0;

        for (const user of users) {
          try {
            await ctx.telegram.sendMessage(user.userId, message, {
              parse_mode: 'HTML',
            });
            sent++;
          } catch (error) {
            failed++;
          }
        }

        await ctx.reply(
          `✅ Xabar yuborildi!\n\n📤 Muvaffaqiyatli: ${sent}\n❌ Muvaffaqiyat siz: ${failed}`
        );
      } catch (error) {
        console.error('Broadcast error:', error);
        ctx.reply('❌ Xatolik yuz berdi');
      }
    });
  });

  // Admin - Back
  bot.action('admin_back', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCbQuery('❌ Ruxsat yo\'q', true);
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🛠️ <b>Admin Panel</b>\n\nQuyidagi buyruqlardan foydalaning:',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '👥 Foydalanuvchilar soni',
                callback_data: 'admin_users',
              },
            ],
            [
              {
                text: '📨 Xabar yuborish',
                callback_data: 'admin_broadcast',
              },
            ],
          ],
        },
      }
    );
  });
}

// Helper function to check user in channel
async function checkUserInChannel(telegram, userId, channelId) {
  try {
    const member = await telegram.getChatMember(channelId, userId);
    return (
      member.status === 'member' ||
      member.status === 'administrator' ||
      member.status === 'creator'
    );
  } catch (error) {
    return false;
  }
}
